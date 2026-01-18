import defaultHandler from './default';
import { reportError } from '../util';
import { detectLanguageWithUkRu } from './shared/uk-ru-detect';

/**
 * DuckDuckGo content handler
 * Filters search results based on language preferences
 * and can change UI language via cookie
 */
export default class duckduckgoHandler extends defaultHandler {
  handlerName = 'duckduckgo';

  // Cache is not needed for DOM-based filtering
  targetLanguagesConfigExpiresAfter = 0;

  // Map of LU language codes to supported DuckDuckGo 'ad' cookie values
  LANGUAGE_CODES = {
    uk: 'uk_UA',
    hy: 'hy_AM',
    af: 'af_ZA',
    be: 'be_BY',
    bg: 'bg_BG',
    de: 'de_DE',
    en: 'en_GB',
    id: 'id_ID',
    nl: 'nl_NL',
    vi: 'vi_VN',
    tr: 'tr_TR',
    ca: 'ca_ES',
    da: 'da_DK',
    et: 'et_EE',
    es: 'es_ES',
    eo: 'eo_XX',
    fr: 'fr_FR',
    hr: 'hr_HR',
    it: 'it_IT',
    lv: 'lv_LV',
    lt: 'lt_LT',
    hu: 'hu_HU',
    no: 'nb_NO',
    pl: 'pl_PL',
    pt: 'pt_PT',
    ro: 'ro_RO',
    sk: 'sk_SK',
    sl: 'sl_SI',
    fi: 'fi_FI',
    sv: 'sv_SE',
    is: 'is_IS',
    cs: 'cs_CZ',
    el: 'el_GR',
    sr: 'sr_RS',
    iw: 'he_IL',
    ar: 'ar_SA',
    fa: 'fa_IR',
    hi: 'hi_IN',
    th: 'th_TH',
    'zh-CN': 'zh_CN',
    'zh-TW': 'zh_TW',
    ja: 'ja_JP',
    ko: 'ko_KR',
  };

  constructor(location, document, userSettings) {
    super(location, document, userSettings);
    this.immediateObserver = null;
    this.debouncedHideAutocomplete = this.debounce(
      () => this.hideAutocompleteIfEmpty(),
      50
    );
  }

  /**
   * Debounce helper - delays function execution until after wait ms have elapsed
   * since the last call
   */
  debounce(func, wait) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  SUPPORTED_LANGUAGES() {
    return ['uk', 'en'];
  }

  /**
   * Get current UI language from DuckDuckGo 'ad' cookie
   * Cookie format: "ad=en_GB" -> returns "en"
   */
  getCurrentLanguageFromCookie() {
    const cookies = this.document.cookie;
    const adMatch = cookies.match(/(?:^|;\s*)ad=([^;]+)/);
    if (adMatch) {
      const adValue = adMatch[1];
      // Extract language part (e.g., 'en' from 'en_GB')
      return adValue.split('_')[0].toLowerCase();
    }
    return null;
  }

  /**
   * Change UI language by setting the 'ad' cookie
   */
  async _changeLanguageTo(languages) {
    if (!languages || languages.length === 0) {
      return;
    }

    const targetLang = languages[0];
    const cookieValue = this.LANGUAGE_CODES[targetLang];

    if (!cookieValue) {
      console.warn(`No cookie mapping for language: ${targetLang}`);
      return;
    }

    // Set the cookie without domain to create host-only cookie (matching DDG's format)
    this.document.cookie = `ad=${cookieValue}; path=/; max-age=31536000; SameSite=Lax`;
    console.log(`DuckDuckGo language cookie set to: ${cookieValue}`);
  }

  /**
   * Check if any language tweaking is needed (filtering or UI language change)
   * Starts filtering immediately if configured (no user prompt needed for filtering)
   */
  async needToTweakLanguages() {
    // Start filtering immediately if configured
    if (this.lessLanguages && this.lessLanguages.length > 0) {
      console.log(
        `Starting DuckDuckGo language filtering for ${this.handlerName}`
      );
      try {
        this.injectFilterStyles();
        this.startObserver();
      } catch (e) {
        reportError(`Error in ${this.handlerName} filtering`, e);
      }
    }

    // Check if UI language change is also needed (includes backoff check)
    return super.needToTweakLanguages();
  }

  /**
   * Start observing immediately to hide articles as they're added
   * This runs synchronously to prevent any flash
   */
  startObserver() {
    // Observe the entire document tree as it's being built
    this.immediateObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType !== Node.ELEMENT_NODE) {
            return;
          }

          // Main OL with initial set of articles added at the load of the page
          if (
            node.tagName === 'OL' &&
            node.classList.contains('react-results--main')
          ) {
            const lis = node.querySelectorAll?.(':scope > li');
            if (lis?.length > 0) {
              // Hide while processing
              node.classList.add('lu-ddg-processing');

              // Process all articles in parallel
              const filterPromises = Array.from(lis).map((liNode) => {
                const article = liNode.querySelector(':scope > article');
                if (!article) {
                  return Promise.resolve();
                }
                return this.filterArticleImmediate(article);
              });

              // Show after all filtering complete
              Promise.all(filterPromises).then(() => {
                node.classList.remove('lu-ddg-processing');
              });
            }
            this.filterRelatedSearches();
          }

          // A new article is added to the main OL
          if (
            node.tagName === 'LI' &&
            node.parentElement?.classList.contains('react-results--main')
          ) {
            const article = node.querySelector(':scope > article');
            if (!article) {
              return;
            }
            this.filterArticleImmediate(article);
          }

          // If it's an autocomplete item, hide it immediately and start detection
          if (
            node.tagName === 'LI' &&
            node.matches?.('li[role="option"][data-reach-combobox-option]')
          ) {
            node.classList.add('lu-ddg-ac-processing');
            // Start language detection immediately (async, fire-and-forget)
            this.filterAutocompleteSuggestionImmediate(node);
          }
        });
      });
    });

    // Start observing from documentElement (or document if that doesn't exist yet)
    const target = this.document.documentElement || this.document;
    this.immediateObserver.observe(target, {
      childList: true,
      subtree: true,
    });
  }

  /**
   * Get related search links from the page
   * These appear at the bottom as "Related searches" or "Пошукові запити, повʼязані з"
   */
  getRelatedSearches() {
    const relatedSearches = [];

    // Find all links that look like related searches
    // They typically have hrefs starting with '/?q=' or 'https://duckduckgo.com/?q='
    const allLinks = Array.from(
      this.document.querySelectorAll('a[href*="?q="]')
    );

    // Filter to only include links that are likely related searches
    // Related searches typically:
    // 1. Are not inside article elements (those are regular results)
    // 2. Have query parameters
    // 3. Are in the bottom section of the page
    allLinks.forEach((link) => {
      // Skip links inside articles (those are regular search results)
      if (link.closest('article')) {
        return;
      }

      // Skip links in the header/navigation
      if (link.closest('header') || link.closest('nav')) {
        return;
      }

      // Check if the href contains search query parameters and points to DuckDuckGo
      const href = link.getAttribute('href');
      // Related searches can have hrefs like "?q=...", "/?q=...", or full URLs with "duckduckgo.com/?q="
      if (
        href &&
        (href.startsWith('?q=') ||
          href.startsWith('/?q=') ||
          href.includes('duckduckgo.com/?q='))
      ) {
        relatedSearches.push(link);
      }
    });

    return relatedSearches;
  }

  /**
   * Core language filtering logic shared by all filtering methods
   * @param {string} text - Text to analyze for language
   * @returns {Promise<{shouldFilter: boolean, language: string|null}>}
   */
  async shouldFilterByLanguage(text) {
    if (!text) {
      return { shouldFilter: false, language: null };
    }

    // Use enhanced UK/RU detection to prevent misclassification
    const language = await detectLanguageWithUkRu(text);

    // Normalize language code by stripping region subtag (e.g., 'en-US' -> 'en')
    // browser.i18n.detectLanguage() may return codes with subtags
    const normalizedLanguage = language
      ? language.toLowerCase().replace(/-.*/, '')
      : null;

    // Filter only if detected language is in lessLanguages
    // If detection returns null (ambiguous), don't filter
    const shouldFilter =
      normalizedLanguage !== null &&
      this.lessLanguages.includes(normalizedLanguage);

    return { shouldFilter, language: normalizedLanguage };
  }

  /**
   * Extract text content from a search result for language detection
   * Only extracts title and snippet to avoid UI elements in user's language
   */
  getResultText(resultElement) {
    // Get the title from h2 > a (this is the page title in the website's language)
    const titleElement = resultElement.querySelector('h2 a');
    const title = titleElement ? titleElement.textContent.trim() : '';

    // Get the snippet/description (this is the page description in the website's language)
    const snippetElement = resultElement.querySelector(
      '[data-result="snippet"]'
    );
    const snippet = snippetElement ? snippetElement.textContent.trim() : '';

    // Only return text from these two elements - they contain the actual website content
    // Everything else in the article is UI chrome (domain labels, buttons) in the user's language
    return `${title} ${snippet}`.trim();
  }

  /**
   * Check if a search result should be filtered based on its language
   */
  async shouldFilterResult(resultElement) {
    try {
      const text = this.getResultText(resultElement);
      const { shouldFilter, language } =
        await this.shouldFilterByLanguage(text);

      if (shouldFilter) {
        console.log(`Filtering result in language ${language}: "${text}"`);
      }

      return shouldFilter;
    } catch (error) {
      console.warn('Error checking if result should be filtered:', error);
      return false;
    }
  }

  /**
   * Filter a single article immediately when detected
   * This runs as soon as the node is added to the DOM
   *
   * @param {HTMLElement} article - The article element
   */
  async filterArticleImmediate(article) {
    try {
      const shouldFilter = await this.shouldFilterResult(article);

      if (shouldFilter) {
        article.classList.add('lu-ddg-filtered');
      }
    } catch (error) {
      reportError('Error filtering DuckDuckGo article', error);
    }
  }

  /**
   * Filter related searches based on language
   */
  async filterRelatedSearches() {
    try {
      const relatedSearches = this.getRelatedSearches();

      if (relatedSearches.length === 0) {
        return;
      }

      // Process each related search link
      let filteredCount = 0;

      for (const link of relatedSearches) {
        const text = link.textContent.trim();
        const { shouldFilter, language } =
          await this.shouldFilterByLanguage(text);

        if (shouldFilter) {
          console.log(
            `Filtering related search in language ${language}: "${text}"`
          );
          // Find the parent li.related-searches__item and hide that instead
          const parentLi = link.closest('li.related-searches__item');
          if (parentLi) {
            parentLi.classList.add('lu-ddg-related-filtered');
          } else {
            // Fallback: hide the link itself
            link.classList.add('lu-ddg-related-filtered');
          }
          filteredCount++;
        }
      }

      // Rebalance and hide if empty
      if (filteredCount > 0) {
        this.rebalanceRelatedSearches();
      }
    } catch (error) {
      reportError('Error filtering DuckDuckGo related searches', error);
    }
  }

  /**
   * Rebalance related searches between two <ol> elements
   * Slurps all items and redistributes them evenly
   * Left column always gets the extra item when odd
   */
  rebalanceRelatedSearches() {
    try {
      const olElements = Array.from(
        this.document.querySelectorAll('ol.related-searches__list')
      );

      if (olElements.length !== 2) {
        return;
      }

      const [leftOl, rightOl] = olElements;

      // Slurp ALL items from both lists
      const allItems = [
        ...leftOl.querySelectorAll('li.related-searches__item'),
        ...rightOl.querySelectorAll('li.related-searches__item'),
      ];

      // Separate visible from filtered
      const visibleItems = allItems.filter(
        (li) => !li.classList.contains('lu-ddg-related-filtered')
      );

      // Hide entire block if no visible items remain
      if (visibleItems.length === 0) {
        const relatedSearchesBlock = this.document.querySelector(
          'li.related_searches'
        );
        if (relatedSearchesBlock) {
          relatedSearchesBlock.classList.add('lu-ddg-related-filtered');
        }
        return;
      }

      // Remove all items from both lists
      allItems.forEach((item) => item.remove());

      // Left gets ceil(n/2), right gets floor(n/2)
      const leftCount = Math.ceil(visibleItems.length / 2);

      // Redistribute all items
      visibleItems.forEach((item, i) => {
        (i < leftCount ? leftOl : rightOl).appendChild(item);
      });
    } catch (error) {
      reportError('Error rebalancing DuckDuckGo related searches', error);
    }
  }

  /**
   * Get autocomplete suggestion items
   */
  getAutocompleteItems() {
    // Get all suggestion items using ARIA role and data attribute
    return Array.from(
      this.document.querySelectorAll(
        'li[role="option"][data-reach-combobox-option]'
      )
    );
  }

  /**
   * Extract text from autocomplete suggestion item
   * Removes UI labels like "Ask Duck.ai", "Shift+Enter", etc.
   */
  getAutocompleteSuggestionText(item) {
    const textContent = item.textContent?.trim() || '';

    // Remove common UI labels that appear in autocomplete suggestions
    // "Запитайте Duck.ai" (Ukrainian), "Ask Duck.ai" (English), etc.
    const cleaned = textContent
      .replace(/–\s*(Запитайте|Ask)\s+Duck\.ai/gi, '')
      .replace(/Shift\+Enter/gi, '')
      .trim();

    return cleaned;
  }

  /**
   * Check if an autocomplete suggestion should be filtered
   */
  async shouldFilterAutocompleteSuggestion(text) {
    const { shouldFilter, language } = await this.shouldFilterByLanguage(text);

    if (shouldFilter) {
      console.log(`Filtering autocomplete in language ${language}: "${text}"`);
    }

    return shouldFilter;
  }

  /**
   * Hide the entire autocomplete dropdown if all suggestions are filtered
   */
  hideAutocompleteIfEmpty() {
    try {
      const allItems = this.getAutocompleteItems();
      const visibleItems = allItems.filter(
        (item) => !item.classList.contains('lu-ddg-ac-filtered')
      );

      if (visibleItems.length === 0 && allItems.length > 0) {
        const autocompletecContainer = this.document.querySelector(
          '[data-testid="search-autocomplete-menu"]'
        );
        if (autocompletecContainer) {
          autocompletecContainer.classList.add('lu-ddg-ac-filtered');
        }
      }
    } catch (error) {
      reportError('Error hiding DuckDuckGo autocomplete dropdown', error);
    }
  }

  /**
   * Filter a single autocomplete suggestion immediately when detected
   * This runs as soon as the node is added to the DOM
   *
   * @param {HTMLElement} item - The autocomplete suggestion item
   */
  async filterAutocompleteSuggestionImmediate(item) {
    try {
      const text = this.getAutocompleteSuggestionText(item);
      const shouldFilter = await this.shouldFilterAutocompleteSuggestion(text);

      // Update item classes based on filtering decision
      if (shouldFilter) {
        item.classList.remove('lu-ddg-ac-processing');
        item.classList.add('lu-ddg-ac-filtered');
      } else {
        item.classList.remove('lu-ddg-ac-processing');
      }

      // Check if dropdown should be hidden (debounced to avoid excessive calls)
      this.debouncedHideAutocomplete();
    } catch (error) {
      // On error, show the item (better to show than to incorrectly filter)
      item.classList.remove('lu-ddg-ac-processing');
      reportError('Error filtering DuckDuckGo autocomplete suggestion', error);
    }
  }

  /**
   * Inject CSS styles to hide all results by default
   * Uses visibility:hidden to maintain page height and prevent infinite scroll cascade
   */
  injectFilterStyles() {
    const styleId = 'lu-ddg-filter-styles';

    // Don't inject if already present
    if (this.document.getElementById(styleId)) {
      return;
    }

    const style = this.document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /* Hide filtered results */
      article.lu-ddg-filtered {
        display: none !important;
      }

      /* Hide filtered related searches */
      a.lu-ddg-related-filtered,
      li.lu-ddg-related-filtered {
        display: none !important;
      }

      /* Hide autocomplete suggestions while processing language detection */
      /* Use display:none instead of visibility:hidden to prevent React flicker */
      li[role="option"][data-reach-combobox-option].lu-ddg-ac-processing {
        display: none !important;
        pointer-events: none !important;
      }

      /* Hide filtered autocomplete suggestions (removes from layout) */
      li[role="option"][data-reach-combobox-option].lu-ddg-ac-filtered {
        display: none !important;
      }

      /* Hide autocomplete dropdown container if all suggestions are filtered */
      [data-testid="search-autocomplete-menu"].lu-ddg-ac-filtered {
        display: none !important;
      }

      /* Hide the entire autocomplete container while any items are being processed
         This prevents flicker from React's incremental rendering */
      [data-testid="search-autocomplete-menu"]:has(li.lu-ddg-ac-processing) {
        opacity: 0 !important;
        pointer-events: none !important;
      }

      /* Hide main results while processing language detection */
      ol.react-results--main.lu-ddg-processing {
        opacity: 0 !important;
      }
    `;

    if (this.document.documentElement) {
      this.document.documentElement.appendChild(style);
    } else {
      reportError(
        "Error injecting CSS in DDG search results: documentElement doesn't exist"
      );
    }
  }
}
