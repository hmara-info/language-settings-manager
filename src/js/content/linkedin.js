import defaultHandler from './default';
import { reportError } from '../util';

// In Firefox fetch is executed in the context of extension,
// content.fetch - in the content of the page. Hence this hack
// https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Content_scripts
const contextFetch = typeof variable !== 'undefined' ? content.fetch : fetch;

export default class linkedinHandler extends defaultHandler {
  handlerName = 'linkedin';

  SUPPORTED_LANGUAGES() {
    return ['uk'];
  }

  static LANG_TO_LOCALE = {
    uk: 'uk_UA',
    en: 'en_US',
    ru: 'ru_RU',
  };
  static LANG_TO_NAME = {
    uk: 'українська',
    en: 'English',
    ru: 'русский',
  };
  static LANG_TO_SECONDARY_NAME = {
    uk: 'Українська',
    en: 'English',
    ru: 'Русский',
  };

  // Reverse SECONDARY_NAME_TO_LANG
  static SECONDARY_NAME_TO_LANG = Object.entries(
    linkedinHandler.LANG_TO_SECONDARY_NAME
  ).reduce((acc, [key, value]) => ((acc[value] = key), acc), {});

  _tweakLanguagesCTA(languageConfig) {
    return 'LinkedIn підтримує Українську. Налаштувати?';
  }

  async _targetLanguagesConfig() {
    const $self = this;
    return fetch(
      'https://www.linkedin.com/psettings/select-language-for-translation'
    )
      .then((response) => response.text())
      .then((html) => $self._parseNotranslateLanguages(html))
      .catch((e) => {
        if (e == $self.NOOP) return e;

        reportError('Failed to parse LinkedIn preferences page', e);
        return Promise.reject($self.NOOP);
      });
  }

  _parseNotranslateLanguages(html) {
    const result = {};
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const lang_matched = html.match(/"lang":\s*"(.*?)"/);
    const CSRF_matched = html.match(/"csrfToken":"(.*?)"/);

    if (!lang_matched || !lang_matched[1]) {
      throw new Error('Failed to match language on LinkedIn prefereces page');
    }
    if (!CSRF_matched || !CSRF_matched[1]) {
      throw new Error('Failed to match CSRF LinkedIn prefereces page');
    }

    const uiLanguage = lang_matched[1].replace(/_.*/, ''); // changes uk_UK to uk

    const languageTranslateTo = doc
      .querySelector(
        'select[name="selectLanguageTranslateTo"] > option[selected]'
      )
      .getAttribute('value')
      .replace(/_.*/, ''); // changes uk_UK to uk

    let dontTranslateLanguagesElements = [];
    doc
      .querySelectorAll(
        'div.existing-secondary-language-detail > span.label-langauge-item'
      )
      .forEach((x) => {
        const text = x.innerText.replace(/\s*\(.*/, '');
        dontTranslateLanguagesElements.push(
          linkedinHandler.SECONDARY_NAME_TO_LANG[text]
        );
      });

    result['CSRF'] = CSRF_matched[1];

    const oldCfg = {};
    result['oldConfig'] = oldCfg;

    oldCfg['uiLanguage'] = uiLanguage;
    oldCfg['languageTranslateTo'] = languageTranslateTo;
    oldCfg['dontTranslateLanguagesElements'] = dontTranslateLanguagesElements;

    /*
      {
        "uiLanguage": "uk",
        "languageTranslateTo": "uk",
        "dontTranslateLanguagesElements": [
            "Українська (Ukrainian)",
            "English (English)"
        ],
        "CSRF": "ajax:1275605328103358844"
      }
    */

    const newConfig = {};
    result['newConfig'] = newConfig;

    if (oldCfg['uiLanguage'] !== this.moreLanguages[0])
      newConfig['uiLanguage'] = this.moreLanguages[0];
    if (oldCfg['languageTranslateTo'] !== this.moreLanguages[0])
      newConfig['languageTranslateTo'] = this.moreLanguages[0];

    const moreLanguages = this.moreLanguages;
    const lessLanguages = this.lessLanguages;
    const newDontTranslateLanguagesElements = dontTranslateLanguagesElements.filter(
      (value) => !lessLanguages.includes(value)
    );
    const addDontTranslate = this.moreLanguages.filter(
      (lang) => !newDontTranslateLanguagesElements.includes(lang)
    );
    newDontTranslateLanguagesElements.push(...addDontTranslate);

    if (
      JSON.stringify(dontTranslateLanguagesElements) !==
      JSON.stringify(newDontTranslateLanguagesElements)
    ) {
      newConfig[
        'dontTranslateLanguagesElements'
      ] = newDontTranslateLanguagesElements;
    }

    if (Object.keys(newConfig).length === 0) {
      return Promise.reject(this.NOOP);
    }

    return result;
  }

  async _changeUILanguageTo(config) {
    if (!config['newConfig']['uiLanguage']) return;
    const locale = linkedinHandler.LANG_TO_LOCALE[config.newConfig.uiLanguage];

    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'x-requested-with': 'XMLHttpRequest',
      },
      body: `locale=${encodeURIComponent(
        locale
      )}&csrfToken=${encodeURIComponent(config.CSRF)}`,
    };

    return contextFetch(
      'https://www.linkedin.com/psettings/select-language',
      requestOptions
    ).then((response) => {
      return true;
    });
  }

  async _changeTranslateLanguageTo(config) {
    if (!config['newConfig']['languageTranslateTo']) return;
    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'x-requested-with': 'XMLHttpRequest',
      },
      body: `locale=${encodeURIComponent(
        config.newConfig.languageTranslateTo
      )}&csrfToken=${encodeURIComponent(config.CSRF)}`,
    };

    // Translate to https://www.linkedin.com/psettings/select-language-for-translation
    // POST
    // locale=de_DE&csrfToken=ajax%3A1275605328103358844

    return contextFetch(
      'https://www.linkedin.com/psettings/select-language-for-translation',
      requestOptions
    ).then((response) => {
      return true;
    });
  }

  async _changeUILanguageTo(config) {
    if (!config['newConfig']['uiLanguage']) return;
    const locale = linkedinHandler.LANG_TO_LOCALE[config.newConfig.uiLanguage];

    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'x-requested-with': 'XMLHttpRequest',
      },
      body: `locale=${encodeURIComponent(
        locale
      )}&csrfToken=${encodeURIComponent(config.CSRF)}`,
    };

    return contextFetch(
      'https://www.linkedin.com/psettings/select-language',
      requestOptions
    ).then((response) => {
      return true;
    });
  }

  async _changeNoTranslateLanguagesTo(config) {
    if (!config['newConfig']['dontTranslateLanguagesElements']) return;
    const languages = config['newConfig']['dontTranslateLanguagesElements'].map(
      (lang) => linkedinHandler.LANG_TO_SECONDARY_NAME[lang]
    );

    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'x-requested-with': 'XMLHttpRequest',
      },
      body: `locales=${encodeURIComponent(
        languages.join(',')
      )}&csrfToken=${encodeURIComponent(config.CSRF)}`,
    };

    // Translate to
    // POST
    // locales=%D0%A3%D0%BA%D1%80%D0%B0%D1%97%D0%BD%D1%81%D1%8C%D0%BA%D0%B0%2CEnglish&csrfToken=ajax%3A1275605328103358844
    // locales: Українська,English

    return contextFetch(
      'https://www.linkedin.com/psettings/select-language-for-translation/secondary-languages',
      requestOptions
    ).then((response) => {
      return true;
    });
  }

  async _changeLanguageTo(config) {
    try {
      return Promise.all([
        this._changeUILanguageTo(config),
        this._changeTranslateLanguageTo(config),
        this._changeNoTranslateLanguagesTo(config),
      ])
        .then((results) => {
          if (results.filter((r) => r != true).length == 0) {
            return;
          }
          /*
          const [
            UILangChangedOK,
            noTranslateLanguagesChangedOk,
            translationsChangedOk,
            disableAutotranslateLanguagesOk,
          ] = results;
          return Promise.reject(
            'One of changeLanguageTo() subcomponents failed',
            results
          );
          */
        })
        .catch((e) => {
          console.log('Error http execution', e);
          return e;
        });
    } catch (e) {
      return Promise.reject(e);
    }
  }
}
