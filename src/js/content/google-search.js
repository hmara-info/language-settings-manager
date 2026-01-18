import defaultHandler from './default';
import { reportError, FEATURES } from '../util';
import { trackAchievement } from '../achievements';
/// #if PLATFORM != 'SAFARI-IOS'
import browser from 'webextension-polyfill';
/// #endif

export default class googleSearchHandler extends defaultHandler {
  handlerName = 'google-search';

  // google page config requires one requests to google backend,
  // so cache results for three hours
  targetLanguagesConfigExpiresAfter = 3 * 60 * 60;

  SUPPORTED_LANGUAGES() {
    return ['uk'];
  }

  _tweakLanguagesCTA(languageConfig) {
    return 'Пошук Google підтримує Українську. Налаштувати?';
  }

  async needToTweakLanguages() {
    try {
      if (
        FEATURES.ACHIEVEMENTS &&
        this.lessLanguages &&
        this.lessLanguages.length
      ) {
        const url = new URL(location.href);
        const lr = url.searchParams.get('lr');

        if (lr && lr.match('-lang_')) {
          browser.runtime.sendMessage({
            type: 'content',
            subtype: 'MsgAchievementUnlocked',
            acKey: 'gs_rewrite',
            options: this._getAchievementVariables(),
          });
        }
      }
    } catch (e) {
      reportError('Failed to process gs_rewrite achievement', e);
    }
    return super.needToTweakLanguages();
  }

  async _targetLanguagesConfig() {
    /*
     * Fetches the "Languages for which you don't
     * want to be offered translations" part of Profile
     */
    const preferencesUrl = this.location.origin + '/preferences?lang=1';
    return fetch(preferencesUrl, { credentials: 'same-origin' })
      .then((r) => r.text())
      .then((html) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        let googleDisplayLang = doc.documentElement.lang
          .replace(/-.*/, '')
          .toLowerCase();

        const checkedMenuItems = doc.querySelectorAll(
          'g-menu-item[aria-checked="true"]'
        );
        const resultsLanguageFilterElement = doc.querySelector(
          '[data-pid="lr"] .vFhVge'
        );
        const selectedLangs = resultsLanguageFilterElement
          .getAttribute('data-selectedlangs')
          .split('|');

        const langMap = {};
        const allLangMap = resultsLanguageFilterElement
          .getAttribute('data-alllangmap')
          .split(';');

        allLangMap.forEach((langPair) => {
          let [langCode, langName] = langPair.split('|');
          langCode = langCode.replace('lang_', '');
          console.log(langCode);
          langMap[langName] = langCode;
        });

        const googleSearchLangs = selectedLangs.map((langName) =>
          langMap[langName].toLowerCase()
        );

        const url = doc.querySelector('div[jscontroller="gri7yb"]').dataset
          .spbu;
        const sigSearchParams = new URLSearchParams(url.split('?')[1]);
        const sig = sigSearchParams.get('sig');
        if (!sig) throw new Error('sig is not defined');

        console.log(
          'UI lang and selectedFilter langs',
          googleDisplayLang,
          googleSearchLangs,
          sig
        );

        const moreLanguages = this.moreLanguages;
        const lessLanguages = this.lessLanguages;
        const supportedWantedLanguages = this.SUPPORTED_LANGUAGES().filter(
          (value) => moreLanguages.includes(value)
        );

        // If the current UI language is already a wanted language,
        // don't suggest any changes - the user is already satisfied
        if (moreLanguages.includes(googleDisplayLang)) {
          return null;
        }

        if (supportedWantedLanguages.length == 0) {
          googleDisplayLang = null;
        } else {
          googleDisplayLang = supportedWantedLanguages[0];
        }

        const newGoogleSearchLangs = googleSearchLangs.filter((lang) => {
          return (
            lessLanguages.indexOf(lang) < 0 &&
            supportedWantedLanguages.indexOf(lang) < 0
          );
        });
        newGoogleSearchLangs.unshift(...supportedWantedLanguages);

        // No changes needed
        if (
          newGoogleSearchLangs.sort().join(',') ===
            googleSearchLangs.sort().join(',') &&
          !googleDisplayLang
        ) {
          return null;
        }

        return {
          googleSearchLangs: newGoogleSearchLangs,
          googleDisplayLang,
          sig,
        };
      })
      .catch((e) => {
        reportError('Failed to parse Google Search preferences page', e);
        return Promise.reject(this.NOOP);
      });
  }

  async _changeLanguageTo(languages) {
    try {
      // e.g. https://www.google.com/setprefs?sig=0_53_.....&hl=uk&lang=uk&lr=lang_uk

      const url = new URL(this.location.origin + '/setprefs');
      url.searchParams.append('sig', languages.sig);
      if (languages.googleDisplayLang) {
        url.searchParams.append('hl', languages.googleDisplayLang);
        url.searchParams.append('lang', languages.googleDisplayLang);
      }
      if (languages.googleSearchLangs) {
        for (let lang of languages.googleSearchLangs) {
          url.searchParams.append('lr', `lang_${lang}`);
        }
      }

      return fetch(url, { credentials: 'same-origin' })
        .then((r) => r.text())
        .then((html) => {
          return true;
        });
    } catch (e) {
      reportError('GSearch changeLanguageTo', err);
      return Promise.reject(e);
    }
  }
}
