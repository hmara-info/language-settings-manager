import defaultHandler from './default';
import { reportError } from '../networking';
import {
  getGoogleUILangugages,
  setGoogleUILangugages,
} from './shared/google-ui-languages';

export default class youtubeHandler extends defaultHandler {
  handlerName = 'youtube';

  SUPPORTED_LANGUAGES() {
    return ['uk'];
  }

  static HTML_LANG_MAP = {
    uk: 'uk-UA',
  };

  static COOKIE_LANG_MAP = {
    uk: 'uk',
  };

  _tweakLanguagesCTA(languageConfig) {
    return 'Інтерфейс Youtube підтримує Українську. Налаштувати?';
  }

  async _targetLanguagesConfig() {
    const $self = this;

    return Promise.all([
      super._targetLanguagesConfig(),
      getGoogleUILangugages(),
    ]).then(([YTLangs, GoogleUILangsConfig]) => {
      const YTLang = YTLangs ? YTLangs[0] : null;

      if (GoogleUILangsConfig) {
        GoogleUILangsConfig.googleLangs = $self._generateNewLanguagesConfig(
          GoogleUILangsConfig.googleLangs
        );
      }

      if (!YTLangs && !GoogleUILangsConfig.googleLangs) {
        return;
      }

      return { YTLang, GoogleUILangsConfig };
    });
  }

  async _changeLanguageTo({ YTLang, GoogleUILangsConfig }) {
    // YT has an odd way of managing UI language preferences by storing those in cookie in PERF cookie, e.g.:
    // PREF=volume=100&tz=Europe.Amsterdam&al=uk%2Ben-GB%2Ben&f4=4000000&f5=20030&f6=40000000&hl=af&gl=UA&f7=100
    // hl and al define the UI, both paramters can be absent
    let prefValue = document.cookie
      .split('; ')
      .find((row) => row.startsWith('PREF='));

    if (prefValue && prefValue.match(/hl=/)) {
      prefValue = prefValue.replace(/hl=.*?(\&|$)/, 'hl=' + YTLang + '$1');
    } else {
      prefValue += '&hl=' + YTLang;
    }

    if (prefValue.match(/al=/)) {
      prefValue = prefValue.replace(/al=.*?(\&|$)/, 'al=' + YTLang + '$1');
    } else {
      prefValue += '&al=' + YTLang;
    }

    const date = new Date();
    date.setTime(date.getTime() + 365 * 24 * 60 * 60 * 1000);
    const expires = '; expires=' + date.toUTCString();
    document.cookie =
      'PREF=' + prefValue + expires + '; domain=.youtube.com; path=/';

    return setGoogleUILangugages(GoogleUILangsConfig).then((r) => {
      this.location.reload();
      return r;
    });
  }
}
