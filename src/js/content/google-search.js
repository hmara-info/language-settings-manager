import defaultHandler from './default';
import { reportError } from '../networking';

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

  async _targetLanguagesConfig() {
    /*
     * Fetches the "Languages for which you don't
     * want to be offered translations" part of Profile
     */
    const preferencesUrl = this.location.origin + '/preferences#languages';
    return fetch(preferencesUrl, { credentials: 'same-origin' })
      .then((r) => r.text())
      .then((html) => {
        try {
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');
          const googleSearchLangs = [
            ...doc.querySelectorAll('#tsuid_1 input[name="lr"][checked="1"]'),
          ].map((x) => x.value);
          let googleDisplayLang = doc.querySelector(
            '#tsuid_1 .URIeEf input[name="lang"][checked="1"]'
          ).value;

          const sig = doc.querySelector('input[name="sig"]').value;

          const moreLanguages = this.moreLanguages;
          const lessLanguages = this.lessLanguages;
          const supportedWantedLanguages = this.SUPPORTED_LANGUAGES().filter(
            (value) => moreLanguages.includes(value)
          );

          if (
            supportedWantedLanguages.length == 0 ||
            supportedWantedLanguages.indexOf(googleDisplayLang) === 0
          ) {
            googleDisplayLang = null;
          } else {
            googleDisplayLang = supportedWantedLanguages[0];
          }

          const newGoogleSearchLangs = googleSearchLangs.filter((lang_lang) => {
            const lang = lang_lang.replace(/^lang_/, '').toLowerCase();
            return (
              lessLanguages.indexOf(lang) < 0 &&
              supportedWantedLanguages.indexOf(lang) < 0
            );
          });
          newGoogleSearchLangs.unshift(
            ...supportedWantedLanguages.map((l) => `lang_${l}`)
          );

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
        } catch (e) {
          console.error(e);
          errorReporter.report('UpdateGoogleSettings - parse', e);
        }
      })
      .catch(function (err) {
        errorReporter.report('UpdateGoogleSettings', err);
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
          url.searchParams.append('lr', lang);
        }
      }

      return fetch(url, { credentials: 'same-origin' })
        .then((r) => r.text())
        .then((html) => {
          return true;
        });
    } catch (e) {
      return Promise.reject(e);
    }
  }
}
