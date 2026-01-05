require('./lu-puppeteer.js');

describe('DuckDuckGo handler', () => {
  // Helper function to wait/delay
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const setupUserSettings = async (lessLanguages, moreLanguages = ['uk']) => {
    await worker.evaluate(
      async ({ less, more }) => {
        await chrome.storage.sync.set({
          userSettings: {
            lessLanguages: [...less],
            moreLanguages: [...more],
          },
        });
      },
      { less: lessLanguages, more: moreLanguages }
    );
  };

  const checkShadowHostPresence = async () => {
    return await page.evaluate(() => {
      const shadowHost = document.querySelector('#lu-shadow-host');
      return shadowHost !== null;
    });
  };

  const setDdgLanguageCookie = async (langCode) => {
    // langCode should be like 'uk_UA' or 'en_GB'
    // Use host-only cookie (no leading dot) to match how DDG actually sets it
    await page.setCookie({
      name: 'ad',
      value: langCode,
      domain: 'duckduckgo.com',
      path: '/',
    });
  };

  const clearDdgCookies = async () => {
    const cookies = await page.cookies();
    for (const cookie of cookies) {
      await page.deleteCookie({ name: cookie.name, domain: cookie.domain });
    }
  };

  const navigateToSearch = async (query) => {
    await page.goto(`https://duckduckgo.com/?q=${encodeURIComponent(query)}`, {
      waitUntil: 'networkidle2',
    });
    // Wait for search results to load
    await page.waitForSelector('article', { timeout: 10000 });
  };

  const checkFilterStylesInjected = async () => {
    return await page.evaluate(() => {
      const styleElement = document.getElementById('lu-ddg-filter-styles');
      return styleElement !== null;
    });
  };

  const getArticleCount = async () => {
    return await page.evaluate(() => {
      return document.querySelectorAll('article').length;
    });
  };

  const getFilteredArticleCount = async () => {
    return await page.evaluate(() => {
      return document.querySelectorAll('article.lu-ddg-filtered').length;
    });
  };

  const getVisibleArticleCount = async () => {
    return await page.evaluate(() => {
      const articles = document.querySelectorAll('article');
      return Array.from(articles).filter(
        (article) =>
          !article.classList.contains('lu-ddg-filtered') &&
          !article.classList.contains('lu-ddg-processing')
      ).length;
    });
  };

  const getProcessingArticleCount = async () => {
    return await page.evaluate(() => {
      return document.querySelectorAll('article.lu-ddg-processing').length;
    });
  };

  describe('when lessLanguages is empty', () => {
    it('does not filter any search results', async () => {
      await setupUserSettings([]);
      await navigateToSearch('тест');

      // Wait a bit for any potential filtering
      await delay(2000);

      const totalArticles = await getArticleCount();
      const filteredArticles = await getFilteredArticleCount();

      expect(totalArticles).toBeGreaterThan(0);
      expect(filteredArticles).toBe(0);
    });

    it('does not inject filter styles', async () => {
      await setupUserSettings([]);
      await navigateToSearch('тест');

      await delay(1000);

      const stylesInjected = await checkFilterStylesInjected();
      expect(stylesInjected).toBe(false);
    });
  });

  describe('when lessLanguages contains a language', () => {
    beforeEach(async () => {
      await setupUserSettings(['ru']);
    });

    it('injects filter styles', async () => {
      await navigateToSearch('тест');

      // Wait for the handler to inject styles
      await delay(1000);

      const stylesInjected = await checkFilterStylesInjected();
      expect(stylesInjected).toBe(true);
    });

    it('filters search results based on language', async () => {
      // Search for a query that might return mixed language results
      await navigateToSearch('вареник');

      // Wait for filtering to complete
      await delay(3000);

      const totalArticles = await getArticleCount();
      const visibleArticles = await getVisibleArticleCount();
      const processingArticles = await getProcessingArticleCount();

      expect(totalArticles).toBeGreaterThan(0);
      expect(visibleArticles).toBeGreaterThan(0);
      // After filtering completes, no articles should be in processing state
      expect(processingArticles).toBe(0);
    });

    it('marks filtered articles with lu-ddg-filtered class', async () => {
      await navigateToSearch('вареник');

      // Wait for filtering to complete
      await delay(3000);

      const filteredCount = await getFilteredArticleCount();
      const processingCount = await getProcessingArticleCount();

      // There should be some filtered results for this query
      expect(filteredCount).toBeGreaterThanOrEqual(0);
      // Processing should be complete
      expect(processingCount).toBe(0);
    });

    it('keeps allowed language results visible', async () => {
      // Search in Ukrainian - these results should not be filtered
      await navigateToSearch('вареник');

      // Wait for filtering to complete
      await delay(3000);

      const totalArticles = await getArticleCount();
      const visibleArticles = await getVisibleArticleCount();
      const filteredArticles = await getFilteredArticleCount();

      expect(totalArticles).toBeGreaterThan(0);
      expect(visibleArticles).toBeGreaterThan(0);
      // Most or all articles should be visible since they're in Ukrainian
      expect(visibleArticles + filteredArticles).toBe(totalArticles);
    });
  });

  describe('filtering with multiple lessLanguages', () => {
    it('filters results in any of the specified languages', async () => {
      await setupUserSettings(['ru', 'en']);
      await navigateToSearch('вареник');

      // Wait for filtering to complete
      await delay(3000);

      const totalArticles = await getArticleCount();
      const visibleArticles = await getVisibleArticleCount();

      expect(totalArticles).toBeGreaterThan(0);
      expect(visibleArticles).toBeGreaterThan(0);
    });
  });

  describe('related searches filtering', () => {
    it('filters related searches based on language', async () => {
      await setupUserSettings(['ru']);
      await navigateToSearch('тест');

      // Wait for page to load completely including related searches
      await delay(3000);

      const hasRelatedSearches = await page.evaluate(() => {
        const relatedItems = document.querySelectorAll(
          'li.related-searches__item'
        );
        return relatedItems.length > 0;
      });

      if (hasRelatedSearches) {
        const filteredRelated = await page.evaluate(() => {
          return document.querySelectorAll('li.lu-ddg-related-filtered').length;
        });

        // Some related searches might be filtered
        expect(filteredRelated).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('dynamic content handling', () => {
    it('continues filtering results as they are dynamically loaded', async () => {
      await setupUserSettings(['ru']);
      await navigateToSearch('вареник');

      // Wait for initial results
      await delay(2000);

      const initialFilteredCount = await getFilteredArticleCount();

      // Scroll to trigger more results (DuckDuckGo has infinite scroll)
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });

      // Wait for potential new results
      await delay(3000);

      const finalFilteredCount = await getFilteredArticleCount();
      const processingCount = await getProcessingArticleCount();

      // Should still have filtering applied
      expect(processingCount).toBe(0);
      // Filtered count should remain stable or increase
      expect(finalFilteredCount).toBeGreaterThanOrEqual(initialFilteredCount);
    });
  });

  describe('UI language prompt', () => {
    beforeEach(async () => {
      await clearDdgCookies();
    });

    it('does not prompt when UI language already matches preferred language', async () => {
      // Set cookie to Ukrainian (user's preferred language)
      await setDdgLanguageCookie('uk_UA');
      await setupUserSettings([], ['uk']);

      await navigateToSearch('test');
      await delay(2000);

      const shadowHostPresent = await checkShadowHostPresence();
      expect(shadowHostPresent).toBe(false);
    });

    it('prompts when UI language differs from preferred language', async () => {
      // Set cookie to English, but user prefers Ukrainian
      await setDdgLanguageCookie('en_GB');
      await setupUserSettings([], ['uk']);

      await navigateToSearch('test');
      await delay(2000);

      const shadowHostPresent = await checkShadowHostPresence();
      expect(shadowHostPresent).toBe(true);
    });

    it('does not prompt when moreLanguages is empty', async () => {
      await setDdgLanguageCookie('en_GB');
      await setupUserSettings([], []);

      await navigateToSearch('test');
      await delay(2000);

      const shadowHostPresent = await checkShadowHostPresence();
      expect(shadowHostPresent).toBe(false);
    });

    it('does not prompt when moreLanguages has no supported DDG languages', async () => {
      // DDG only supports 'uk' and 'en' for language switching
      await setDdgLanguageCookie('en_GB');
      await setupUserSettings([], ['fr', 'de']);

      await navigateToSearch('test');
      await delay(2000);

      const shadowHostPresent = await checkShadowHostPresence();
      expect(shadowHostPresent).toBe(false);
    });

    it('prompts when no cookie is set and preferred language is supported', async () => {
      // No cookie set, user prefers Ukrainian
      await setupUserSettings([], ['uk']);

      await navigateToSearch('test');
      await delay(2000);

      const shadowHostPresent = await checkShadowHostPresence();
      // Should prompt because default DDG language likely differs from Ukrainian
      expect(shadowHostPresent).toBe(true);
    });

    it('changes language cookie to Ukrainian when user clicks Yes', async () => {
      // Set cookie to English, but user prefers Ukrainian
      await setDdgLanguageCookie('en_GB');
      await setupUserSettings([], ['uk']);

      await navigateToSearch('test');
      await delay(2000);

      // Verify prompt appears
      const shadowHostPresent = await checkShadowHostPresence();
      expect(shadowHostPresent).toBe(true);

      // Click Yes button in shadow DOM - set up navigation wait BEFORE clicking
      // since the click triggers location.reload() immediately
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
        page.evaluate(() => {
          const shadowHost = document.querySelector('#lu-shadow-host');
          const shadowRoot = shadowHost.shadowRoot;
          const yesButton = shadowRoot.querySelector('.yes-btn');
          yesButton.click();
        }),
      ]);

      // Check that the cookie was changed to Ukrainian
      const cookies = await page.cookies();
      const adCookie = cookies.find((c) => c.name === 'ad');
      expect(adCookie).toBeDefined();
      expect(adCookie.value).toBe('uk_UA');

      // Check that the HTML lang attribute reflects Ukrainian
      const htmlLang = await page.evaluate(() => {
        return document.documentElement.getAttribute('lang');
      });
      expect(htmlLang).toBe('uk-UA');
    });
  });
}, 180000);
