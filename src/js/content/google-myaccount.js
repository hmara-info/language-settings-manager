import defaultHandler from './default';
import { reportError } from '../util';
import {
  getGoogleUILangugages,
  setGoogleUILangugages,
} from './shared/google-ui-languages';

export default class googleMyaccountHandler extends defaultHandler {
  handlerName = 'google-myaccount';

  preferencesPath = '/language';
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
      $self.location.pathname === $self.preferencesPath
        ? $self.document.documentElement.innerHTML
        : null;

    return getGoogleUILangugages(html)
      .then((GoogleUILangsConfig) => {
        if (!GoogleUILangsConfig || !GoogleUILangsConfig.googleLangs) {
          reportError('Failed to parse Google Account preferences page', e);
          return Promise.reject($self.NOOP);
        }
        GoogleUILangsConfig.googleLangs = $self._generateNewLanguagesConfig(
          GoogleUILangsConfig.googleLangs
        );
        if (!GoogleUILangsConfig.googleLangs) {
          return Promise.reject($self.NOOP);
        }
        return GoogleUILangsConfig;
      })
      .catch((e) => {
        if (e === $self.NOOP) throw e;

        reportError('Failed to parse Google Account preferences page', e);
        throw e;
      });
  }

  async _changeLanguageTo(GoogleUILangsConfig) {
    return setGoogleUILangugages(GoogleUILangsConfig);
  }
}
