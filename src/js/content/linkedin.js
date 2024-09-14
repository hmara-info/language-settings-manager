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

  // scraped from https://www.linkedin.com/mypreferences/d/language
  static LANG_TO_LOCALE = {
    ar: 'ar_AE',
    cs: 'cs_CZ',
    da: 'da_DK',
    de: 'de_DE',
    en: 'en_US',
    es: 'es_ES',
    fr: 'fr_FR',
    hi: 'hi_IN',
    in: 'in_ID',
    it: 'it_IT',
    ja: 'ja_JP',
    ko: 'ko_KR',
    ms: 'ms_MY',
    nl: 'nl_NL',
    no: 'no_NO',
    pl: 'pl_PL',
    pt: 'pt_BR',
    ro: 'ro_RO',
    ru: 'ru_RU',
    sv: 'sv_SE',
    th: 'th_TH',
    tl: 'tl_PH',
    tr: 'tr_TR',
    uk: 'uk_UA',
    zh: 'zh_CN',
    zh: 'zh_TW',
  };

  /* scraped via script from https://www.linkedin.com/mypreferences/d/language-for-translation
     let langs = {};
     document
        .querySelectorAll('input[name="secondaryLanguageSetting"]')
        .forEach((x) => {
          const locale = x.id.replace(/^secondary_language_(.+?)(_.*)?$/, '$1');
          const value = x.value;
          langs[locale] = value;
        });
     console.log(JSON.stringify(langs));
     */

  static LANG_TO_SECONDARY_NAME = {
    af: 'Afrikaans',
    in: 'Bahasa Indonesia',
    ms: 'Bahasa Malaysia',
    bs: 'Bosanski',
    ca: 'Català',
    cs: 'Čeština',
    cy: 'Cymraeg',
    da: 'Dansk',
    de: 'Deutsch',
    et: 'Eesti keel',
    en: 'English',
    es: 'Español',
    fr: 'Français',
    hr: 'Hrvatski',
    it: 'Italiano',
    sw: 'Kiswahili',
    lv: 'Latviešu valoda',
    lt: 'Lietuvių kalba',
    hu: 'Magyar',
    mt: 'Malti',
    nl: 'Nederlands',
    no: 'Norsk',
    pl: 'Polski',
    pt: 'Português',
    ro: 'Română',
    sk: 'Slovenčina',
    sl: 'Slovenščina',
    sr: 'Cрпски',
    fi: 'Suomi',
    sv: 'Svenska',
    tl: 'Tagalog',
    vi: 'Tiếng việt',
    tr: 'Türkçe',
    zh: '正體中文',
    ja: '日本語',
    ko: '한국어',
    ar: 'العربية',
    fa: 'فارسى',
    he: 'עברית',
    ur: 'اردو',
    hi: 'हिन्दी',
    th: 'ภาษาไทย',
    el: 'ελληνικά',
    bg: 'български',
    ru: 'Русский',
    uk: 'Українська',
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

    // User is not logged in, nothing to do
    if (!document.querySelector('.global-nav__me')) {
      return null;
    }

    return fetch(
      'https://www.linkedin.com/psettings/select-language-for-translation?li_theme=light&openInMobileMode=true'
    )
      .then((response) => response.text())
      .then((html) => $self._parseNotranslateLanguages(html));
  }

  _parseNotranslateLanguages(html) {
    const result = {};
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const uiLanguage = doc.documentElement.lang
      .replace(/-.*/, '')
      .toLowerCase();

    const languageTranslateTo = doc
      .querySelector('input[name="primaryLanguageSetting"]:checked')
      .value.replace(/_.*/, '');
    if (!languageTranslateTo) {
      throw new Error(
        'Failed to match languageTranslateTo language on LinkedIn prefereces page'
      );
    }

    let dontTranslateLanguagesElements = [];
    doc.querySelectorAll('span.label-secondary-langauge-item').forEach((x) => {
      const text = x.innerText.replace(/\s*\(.*/, '');
      dontTranslateLanguagesElements.push(text);
    });

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
            "Українська",
            "English"
        ]
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
    const newDontTranslateLanguagesElements =
      dontTranslateLanguagesElements.filter(
        (value) =>
          !lessLanguages.includes(linkedinHandler.SECONDARY_NAME_TO_LANG[value])
      );
    this.moreLanguages.forEach((lang) => {
      const langMapped = linkedinHandler.LANG_TO_SECONDARY_NAME[lang];
      if (!newDontTranslateLanguagesElements.includes(langMapped)) {
        newDontTranslateLanguagesElements.push(langMapped);
      }
    });

    if (
      JSON.stringify(dontTranslateLanguagesElements) !==
      JSON.stringify(newDontTranslateLanguagesElements)
    ) {
      newConfig['dontTranslateLanguagesElements'] =
        newDontTranslateLanguagesElements;
    }

    if (Object.keys(newConfig).length === 0) {
      return null;
    }

    return result;
  }

  async _changeTranslateLanguageTo(config) {
    if (!config['newConfig']['languageTranslateTo']) return;

    const CSRF = await this._getCSRF();
    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'x-requested-with': 'XMLHttpRequest',
      },
      body: `locale=${encodeURIComponent(
        config.newConfig.languageTranslateTo
      )}&csrfToken=${encodeURIComponent(CSRF)}`,
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

    const CSRF = await this._getCSRF();

    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'x-requested-with': 'XMLHttpRequest',
      },
      body: `locale=${encodeURIComponent(
        locale
      )}&csrfToken=${encodeURIComponent(CSRF)}`,
    };

    return contextFetch(
      'https://www.linkedin.com/psettings/select-language',
      requestOptions
    ).then((response) => {
      return true;
    });
  }

  async _changeNoTranslateLanguagesTo(config) {
    const languages = config['newConfig']['dontTranslateLanguagesElements'];
    if (!languages) return;

    const CSRF = await this._getCSRF();
    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'x-requested-with': 'XMLHttpRequest',
      },
      body: `locales=${encodeURIComponent(
        languages.join(',')
      )}&csrfToken=${encodeURIComponent(CSRF)}`,
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
    return this._changeUILanguageTo(config)
      .then(() => this._changeTranslateLanguageTo(config))
      .then(() => this._changeNoTranslateLanguagesTo(config))
      .catch((e) => {
        console.log('Error http execution', e);
        return e;
      });
  }

  async _getCSRF() {
    return fetch(
      'https://www.linkedin.com/psettings/select-language-for-translation?li_theme=light&openInMobileMode=true'
    )
      .then((response) => response.text())
      .then((html) => this._parseCSRF(html));
  }

  _parseCSRF(html) {
    const CSRF_matched = html.match(/"csrfToken":"(.*?)"/);

    if (!CSRF_matched || !CSRF_matched[1]) {
      throw new Error('Failed to match CSRF LinkedIn prefereces page');
    }
    return CSRF_matched[1];
  }
}
