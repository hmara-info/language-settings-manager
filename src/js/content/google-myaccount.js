import defaultHandler from './default';
import { reportError } from '../util';
import {
  getGoogleUILangugages,
  setGoogleUILangugages,
} from './shared/google-ui-languages';

export default class googleMyaccountHandler extends defaultHandler {
  handlerName = 'google-myaccount';

  preferencesUrl = 'https://myaccount.google.com/language';
  SUPPORTED_LANGUAGES() {
    return ['uk', 'en'];
  }

  HTML_LANG_MAP = {
    uk: 'uk',
    en: 'en-GB',
  };

  COOKIE_LANG_MAP = {
    uk: 'uk',
  };

  _tweakLanguagesCTA(languageConfig) {
    return 'Інтерфейси Google підтримують Українську. Налаштувати?';
  }

  async _targetLanguagesConfig() {
    const $self = this;
    const html =
      $self.location.href === $self.preferencesUrl
        ? $self.document.documentElement.innerHTML
        : null;

    return getGoogleUILangugages(html).then((GoogleUILangsConfig) => {
      if (!GoogleUILangsConfig || !GoogleUILangsConfig.googleLangs) {
        return;
      }
      GoogleUILangsConfig.googleLangs = $self._generateNewLanguagesConfig(
        GoogleUILangsConfig.googleLangs
      );
      if (!GoogleUILangsConfig.googleLangs) {
        return;
      }
      return GoogleUILangsConfig.googleLangs;
    });
  }

  async _changeLanguageTo(GoogleUILangsConfig) {
    return setGoogleUILangugages(GoogleUILangsConfig).then((r) => {
      this.location.reload();
      return r;
    });
  }
}
