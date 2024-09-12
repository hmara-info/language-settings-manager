import { storageGet, storageGetSync, storageSet, storageRemove } from '../util';
import { reportError, FEATURES } from '../util';
import browser from 'webextension-polyfill';

const promptsFrequency = {
  slow: 7 * 60 * 60 * 1000,
  gentle: 1 * 60 * 60 * 1000,
  fast: 1 * 60 * 1000,
  immediately: 1 * 60 * 1000,
};

export default class handler {
  handlerName = 'default';

  NOOP = 'Nothing to do';

  // default handler doesn't cache page config,
  // as retrieving it is a cheap operation
  targetLanguagesConfigExpiresAfter = 0;

  constructor(location, document, moreLanguages, lessLanguages) {
    this.location = location;
    this.document = document;
    this.moreLanguages = moreLanguages;
    this.lessLanguages = lessLanguages;
  }

  SUPPORTED_LANGUAGES() {
    return [];
  }

  get cacheKey() {
    return `handler.${this.handlerName}`;
  }

  get isEnabled() {
    const featureName =
      'CT_' + this.handlerName.toUpperCase().replace(/-/g, '_');
    return FEATURES[featureName];
  }

  async needToTweakLanguages() {
    console.log(`Entering needToTweakLanguages() of ${this.handlerName}`);
    const $self = this;
    return Promise.all([
      storageGetSync(['userSettings', 'lastPromptTs']),
      storageGet($self._achievementKey()),
    ])
      .then(async ([userData, expectAchievementData]) => {
        const expectAchievement =
          expectAchievementData[$self._achievementKey()];
        if (FEATURES.ACHIEVEMENTS && expectAchievement) {
          console.log(
            `NOT checking the last prompt timestamp, as an achievement is expected`
          );
          storageRemove($self._achievementKey());
          return true;
        }

        // Check if it's too early for any prompts
        const userSettings = userData.userSettings || {};
        const speed = userSettings.speed || 'gentle';
        const lastPromptTs = userData.lastPromptTs || 0;
        const timeSinceUserPrompted =
          Math.floor(Date.now() / 1000) - lastPromptTs;

        // Caching is disabled in dev environment to ease debugging
        if (process.env.NODE_ENV === 'development') return false;

        // Too early for any prompts
        if (promptsFrequency[speed] >= timeSinceUserPrompted) {
          return Promise.reject($self.NOOP);
        }

        // Regular config check, no achievements expected
        return false;
      })
      .then(async (expectAchievement) => {
        console.log(`Refreshing targetLanguagesConfig at ${$self.handlerName}`);
        const config = await $self.targetLanguagesConfig();
        console.log(`targetLanguagesConfig at ${$self.handlerName} is`, config);

        if (FEATURES.ACHIEVEMENTS && expectAchievement) {
          if (!config) {
            browser.runtime.sendMessage({
              type: 'content',
              subtype: 'MsgAchievementUnlocked',
              acKey: $self._achievementKey(),
              options: $self._getAchievementVariables(),
            });
          } else {
            console.error(
              `Expected achievement, but targetLanguagesConfig still present at ${$self.handlerName}`
            );
          }
          return Promise.reject($self.NOOP);
        }

        if (config == null) {
          return Promise.reject($self.NOOP);
        }

        return config;
      });
  }

  removeUI() {
    const oldElements = this.document.getElementsByClassName(
      'lahidnaUkrainizatsiya'
    );
    for (let el of oldElements) {
      el.remove();
    }
  }

  async tweakLanguages() {
    const $self = this;
    console.log(`Entering tweakLanguages of ${this.handlerName}`);

    return $self
      .suggestToChangeLanguages()
      .then((language) => $self.changeLanguageTo(language))
      .then(() => $self._expectAchievement())
      .then(() => $self._reloadPageOnceLanguagesChanged());
  }

  async _expectAchievement() {
    if (!FEATURES.ACHIEVEMENTS) return true;
    // NOTE: the same key is used in two different namespaces.
    //
    // content/default.js is using storage.local to mark that achievement
    //   is expected and should be visualised;
    //
    // achievements.js is using storage.sync to permanently track the goals achieved
    storageSet({ [this._achievementKey()]: 1 });

    return true;
  }

  _reloadPageOnceLanguagesChanged() {
    this.location.reload();
  }

  _achievementKey() {
    return `CT_${this.handlerName}`;
  }

  _tweakLanguagesCTA(languageConfig) {
    return 'Ресурс підтримує Українську. Налаштувати?';
  }

  async suggestToChangeLanguages() {
    console.log(`Entering suggestToChangeLanguages of ${this.handlerName}`);
    const $self = this;
    return $self.targetLanguagesConfig().then(async (languageConfig) => {
      console.log(
        `-> ${$self.handlerName}.targetLanguagesConfig() with config:`,
        languageConfig
      );

      return new Promise(async (resolve, reject) => {
          $self.removeUI();
          const callToAction = $self._tweakLanguagesCTA(languageConfig);
          const floaterHTML = `
<style>
  /* Make sure inner elements don't inhering any CSS, but browser defaults */
  :host {
    all: initial;
  }
  .lahidnaUkrainizatsiya {
    z-index:5000;
    width:100%;
    position: fixed;
    top: 0;
  }
  .lahidnaUkrainizatsiya > div {
    margin: 20px;
    padding: 10px;
    border: 1px solid rgba(0,0,0,.09);
    box-shadow: 15px -4px 17px 1px rgba(19, 19, 22, 0.28);
    border-radius: 3px;
    background: #f3f1f1;
  }

  @media (prefers-color-scheme: dark) {
    :host {
      color: #FFFFFF;
    }
    .lahidnaUkrainizatsiya > div {
      background: #27282b;
      box-shadow: 15px -4px 17px 1px rgba(83, 83, 83, 0.30);
      border: 1px solid rgba(255,255,255,.09);
    }
  }

  .lahidnaUkrainizatsiya input {
    padding: 4px;
    margin-top: 4px;
  }
  img.lu-logo {
    width: 25px;
    height: 25px;
    border-radius: 50%;
    background-color: #009393;
    padding: 5px;
    box-shadow: 2px 1px 1px rgba(0, 0, 0, 0.3);
    margin-right: 1em;
    vertical-align:middle;
  }

</style>
<div class="lahidnaUkrainizatsiya" translate="no">
  <div>
    <img class="lu-logo" src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTgiIGhlaWdodD0iMzQiIHZpZXdCb3g9IjAgMCA1OCAzNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTQ4LjYwNTMgMTMuOTg0NUM0Ny44NTM5IDkuMTc0OTUgNDMuNjg0MyA1LjQ4MzQ5IDM4LjY2NjkgNS40ODM0OUMzNi43Nzk0IDUuNDgzNDkgMzQuOTY1NiA2LjAwNTcyIDMzLjM5MjQgNi45Nzk3N0MzMC45OTkxIDIuOTU3NTIgMjYuNjkwNCAwLjQ1NDU1OSAyMS45MDM4IDAuNDU0NTU5QzE0LjUwOTQgMC40NTQ1NTkgOC40OTMzMSA2LjQ3MDYxIDguNDkzMzEgMTMuODY1QzguNDkzMzEgMTMuOTEwOSA4LjQ5MzMxIDEzLjk1ODQgOC40OTQ5OCAxNC4wMDQyQzMuNzQyNjQgMTQuODA0NyAwIDE4Ljk0OCAwIDIzLjkyMjlDMCAyOS40NjkxIDQuNjIzMzggMzMuOTgwOCAxMC4xNjk2IDMzLjk4MDhINDcuMDQ4NUM1Mi41OTQ3IDMzLjk4MDggNTcuMjE4MSAyOS40NjkxIDU3LjIxODEgMjMuOTIyOUM1Ny4yMTgxIDE4LjkwNTUgNTMuNDE0OSAxNC43MzU5IDQ4LjYwNTMgMTMuOTg0NVoiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo=">
    <span>${callToAction}</span>
    <div style="float: right">
      <input type='button' value='Так' class='yes-btn' />
      <input type='button' value='Пізніше' class='no-btn' />
    </div>
  </div>
</div>
`;
          const floaterHost = $self.document.createElement('div');
        floaterHost.setAttribute('id', 'lu-shadow-host');
          const dom = floaterHost.attachShadow({ mode: 'open' });
        $self.document.documentElement.appendChild(floaterHost);
          dom.innerHTML = floaterHTML.trim();
          const floater = dom.firstChild;

          const observer = new MutationObserver(function (mutations) {
            // check for removed target
            mutations.forEach(function (mutation) {
              var nodes = Array.from(mutation.removedNodes);
              if (nodes.indexOf(floater) <= -1) return;
              if (reject) {
                reject('node removed');
              }
              observer.disconnect();
            });
          });

          observer.observe(dom, {
            childList: true,
          });

          // Create ui in DOM
          // Bind 'Yes' function
          dom
            .querySelector('.lahidnaUkrainizatsiya .yes-btn')
            .addEventListener('click', function (e) {
              resolve(languageConfig);
              reject = undefined;
              floater.remove();
            });

          // Bind 'No' function
          dom
            .querySelector('.lahidnaUkrainizatsiya .no-btn')
            .addEventListener('click', function (e) {
              const options = JSON.stringify(languageConfig);
              reject(`user answered no to options ${options}`);
              reject = undefined;
              floater.remove();
            });
      });
    });
  }

  async changeLanguageTo(languages) {
    console.log(
      `-> ${this.handlerName}.changeLanguageTo(languages); languages:`,
      languages
    );
    return this._changeLanguageTo(languages).then(() =>
      this._targetLanguagesConfigDropCache()
    );
  }

  async targetLanguagesConfig() {
    return this._targetLanguagesConfigCached().then((cachedConfig) => {
      if (cachedConfig && cachedConfig.data) {
        return cachedConfig.data;
      }
      return this._targetLanguagesConfig().then((config) =>
        this._targetLanguagesConfigUpdateCache(config)
      );
    });
  }

  async _targetLanguagesConfig() {
    const moreLanguages = this.moreLanguages;
    const supportedWantedLanguages = this.SUPPORTED_LANGUAGES().filter(
      (value) => moreLanguages.includes(value)
    );

    if (supportedWantedLanguages.length == 0) return Promise.reject(this.NOOP);

    const uiLanguage = this.document.documentElement.lang
      .replace(/-.*/, '')
      .toLowerCase();

    if (supportedWantedLanguages.indexOf(uiLanguage) === 0)
      return Promise.reject(this.NOOP);

    const config = supportedWantedLanguages.filter(
      (value) => value !== uiLanguage
    );

    if (!config.length) {
      return Promise.reject(this.NOOP);
    }

    return config;
  }

  _targetLanguagesConfigCached() {
    return storageGet(this.cacheKey).then((items) => {
      const cache = items[this.cacheKey];
      if (!cache || !cache.ts) {
        return;
      }
      const targetLanguagesConfigAge = Math.round(
        (new Date().getTime() - cache.ts) / 1000
      );
      if (targetLanguagesConfigAge > this.targetLanguagesConfigExpiresAfter) {
        return;
      }
      return cache;
    });
  }

  async _targetLanguagesConfigUpdateCache(config) {
    const cacheKey = this.cacheKey;
    storageSet({
      cacheKey: { data: config, ts: new Date().getTime() },
    });
    return config;
  }

  async _targetLanguagesConfigDropCache() {
    return storageRemove(this.cacheKey);
  }

  /* _generateNewLanguagesConfig() takes the current service config
   * in the form of an array of language codes
   * Returns the new suggested configuration, according to the user preferences.
   *
   * _generateNewLanguagesConfig() will return null if user preferences trigger
   * no changes to the service configuration or the initial service configuration was null or an empty array
   */

  _generateNewLanguagesConfig(currentConfig) {
    if (!currentConfig) return null;

    const $self = this;

    const moreLanguages = this.moreLanguages;
    const lessLanguages = this.lessLanguages;
    const supportedWantedLanguages = $self
      .SUPPORTED_LANGUAGES()
      .filter((value) => moreLanguages.includes(value));

    const newLangs = currentConfig.filter((lang_lang) => {
      // the 'replace' part will have to evolve, as we add support for various dialects
      const lang = lang_lang.toLowerCase().replace(/-.*/, '');
      return lessLanguages.indexOf(lang) < 0;
    });

    newLangs.unshift(
      ...supportedWantedLanguages.filter((lang_lang) => {
        const lang = lang_lang.toLowerCase().replace(/-.*/, '');
        return newLangs.indexOf(lang) < 0;
      })
    );

    if (newLangs.length === 0) {
      return null;
    }

    // No changes needed
    if (
      newLangs.concat().sort().join(',') ===
      currentConfig.concat().sort().join(',')
    ) {
      return null;
    }

    // Suggest new config
    return newLangs;
  }

  _getAchievementVariables() {
    const dict = {};

    // Don't show languages unsupported by the handler
    const supportedWantedLanguages = this.SUPPORTED_LANGUAGES().filter(
      (value) => this.moreLanguages.includes(value)
    );

    dict.lessLanguages = this.lessLanguages
      .map((l) => `__MSG_lang_${l.replace(/-/g, '_')}_genetivus__`)
      .join(', ')
      .replace(/, ([^,]+)$/, ' та $1');
    dict.moreLanguages = supportedWantedLanguages
      .map((l) => `__MSG_lang_${l.replace(/-/g, '_')}_nominativus__`)
      .join(', ')
      .replace(/, ([^,]+)$/, ' та $1');

    if (supportedWantedLanguages.length) {
      dict.firstLanguage = `__MSG_lang_${supportedWantedLanguages[0].replace(
        /-/g,
        '_'
      )}_instrumentalis__`;
    } else {
      // For now this is known to happen with gs_rewrite,
      // which only requires 'lessLanguages'
      reportError(
        'Goal reached, none of wanted languages supported',
        new Error('stack')
      );
      dict.firstLanguage = '';
    }

    return dict;
  }
}
