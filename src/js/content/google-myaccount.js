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

    return getGoogleUILangugages(html)
      .then((GoogleUILangsConfig) => {
        if (!GoogleUILangsConfig || !GoogleUILangsConfig.googleLangs) {
          reportError('Failed to parse Google Account preferences page', e);
          return;
        }
        GoogleUILangsConfig.googleLangs = $self._generateNewLanguagesConfig(
          GoogleUILangsConfig.googleLangs
        );
        if (!GoogleUILangsConfig.googleLangs) {
          return Promise.reject($self.NOOP);
        }
        return GoogleUILangsConfig.googleLangs;
      })
      .catch((e) => {
        if (e === $self.NOOP) return e;

        reportError('Failed to parse Google Account preferences page', e);
        return Promise.reject($self.NOOP);
      });
  }

  async _changeLanguageTo(GoogleUILangsConfig) {
    return setGoogleUILangugages(GoogleUILangsConfig);
  }
}
