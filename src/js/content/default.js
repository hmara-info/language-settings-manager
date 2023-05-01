import { storageGet, storageGetSync, storageSet, storageRemove } from '../util';
import { reportError } from '../util';

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

  async needToTweakLanguages() {
    console.log(`Entering needToTweakLanguages() of ${this.handlerName}`);
    const $self = this;
    return storageGetSync(['userSettings', 'lastPromptTs'])
      .then((data) => {
        const userSettings = data.userSettings || {};
        const speed = userSettings.speed || 'gentle';
        const lastPromptTs = data.lastPromptTs || 0;
        const timeSinceUserPrompted =
          Math.floor(Date.now() / 1000) - lastPromptTs;

        if (
          process.env.NODE_ENV === 'development' ||
          promptsFrequency[speed] > timeSinceUserPrompted
        ) {
          // User prompted a while ago, we can do it again
          console.log(
            `Refreshing targetLanguagesConfig at ${this.handlerName}`
          );
          return $self.targetLanguagesConfig();
        }

        console.log(
          `No need to refres targetLanguagesConfig at ${this.handlerName}`
        );
        return Promise.reject($self.NOOP);
      })
      .then((config) => {
        console.log(`targetLanguagesConfig at ${this.handlerName} is`, config);
        return config == null ? Promise.reject($self.NOOP) : config;
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
      .then(() => $self._reloadPageOnceLanguagesChanged());
  }

  _reloadPageOnceLanguagesChanged() {
    this.location.reload();
  }

  _tweakLanguagesCTA(languageConfig) {
    return 'Ресурс підтримує Українську. Налаштувати?';
  }

  async suggestToChangeLanguages() {
    console.log(`Entering suggestToChangeLanguages of ${this.handlerName}`);
    const $self = this;
    return $self.targetLanguagesConfig().then(
      (languageConfig) =>
        new Promise(async (resolve, reject) => {
          $self.removeUI();
          const callToAction = $self._tweakLanguagesCTA(languageConfig);

          const floaterHTML = `
<div style="z-index:5000; width:100%; position: fixed; top: 0;" class="lahidnaUkrainizatsiya" translate="no">
  <div style="margin: 20px; padding: 10px; border: 1px solid rgba(0,0,0,.09); box-shadow: 15px -4px 17px 1px rgba(19, 19, 22, 0.28); border-radius: 3px; background: #f3f1f1;">
    <span>${callToAction}</span>
    <div style="float: right">
      <input type='button' value='Так' style='padding: 4px;' class='yes-btn' />
      <input type='button' value='Пізніше' style='padding: 4px;' class='no-btn' />
    </div>
  </div>
</div>
`;
          const floaterTemplate = $self.document.createElement('template');
          floaterTemplate.innerHTML = floaterHTML.trim();
          const floater = floaterTemplate.content.firstChild;
          $self.document.body.appendChild(floater);

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

          observer.observe($self.document.body, {
            childList: true,
          });

          // Create ui in DOM
          // Bind 'Yes' function
          $self.document
            .querySelector('.lahidnaUkrainizatsiya .yes-btn')
            .addEventListener('click', function (e) {
              resolve(languageConfig);
              reject = undefined;
              floater.remove();
            });

          // Bind 'No' function
          $self.document
            .querySelector('.lahidnaUkrainizatsiya .no-btn')
            .addEventListener('click', function (e) {
              const options = JSON.stringify(languageConfig);
              reject(`user answered no to options ${options}`);
              reject = undefined;
              floater.remove();
            });
        })
    );
  }

  async changeLanguageTo(languages) {
    console.log(
      `Entering changeLanguageTo of ${this.handlerName}. Languages config:`,
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
      return this._targetLanguagesConfig().then((config) => {
        return this._targetLanguagesConfigUpdateCache(config);
      });
    });
  }

  async _targetLanguagesConfig() {
    const moreLanguages = this.moreLanguages;
    const supportedWantedLanguages = this.SUPPORTED_LANGUAGES().filter(
      (value) => moreLanguages.includes(value)
    );

    if (supportedWantedLanguages.length == 0) return null;

    const uiLanguage = this.document.documentElement.lang
      .replace(/-.*/, '')
      .toLowerCase();

    if (supportedWantedLanguages.indexOf(uiLanguage) === 0) return;

    return supportedWantedLanguages.filter((value) => value !== uiLanguage);
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
    return storageSet({
      [cacheKey]: { data: config, ts: new Date().getTime() },
    }).then(() => config);
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
}
