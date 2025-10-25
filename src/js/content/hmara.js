import defaultHandler from './default';
import { storageGetSync, getExtensionVersion } from '../util';
/// #if PLATFORM != 'SAFARI-IOS'
import browser from 'webextension-polyfill';
/// #endif

export default class hmaraHandler extends defaultHandler {
  handlerName = 'hmara';
  /* Inherits the interface, but completely overrites base class behavior
   */

  async needToTweakLanguages() {
    const $self = this;
    /* Tweak main page content with user's progress */

    // The extension is intalled, if this code runs. Thus checking
    storageGetSync(null).then((data) => {
      const moreLanguages = data.userSettings?.moreLanguages;
      const lessLanguages = data.userSettings?.lessLanguages;
      const achievements = Object.keys(data).filter((key) =>
        key.startsWith('AC_')
      );
      const userId = data.userId;
      const eventData = {
        version: getExtensionVersion(),
        isInstalled: true,
        isConfigured: !!(moreLanguages && lessLanguages),
        isExperienced: !!achievements?.length,
        optionsUrl: browser.runtime.getURL('options.html'),
        userId: userId,
        moreLanguages,
        lessLanguages,
      };

      const event = new CustomEvent('LU', {
        detail: JSON.stringify(eventData),
      });
      $self.document.dispatchEvent(event);
    });

    return $self.NOOP;
  }

  async changeLanguageTo(languages) {
    return $self.NOOP;
  }
}
