import '../img/icon-128.png';
import '../img/icon-64.png';
import '../img/icon-32.png';
console.log('Content loading');
/// #if PLATFORM == 'SAFARI-IOS'
import './ios-safari-fixup';
/// #endif

import { storageGetSync, reportError, FEATURES } from './util';
import { dispatch } from './routing';

storageGetSync('userSettings').then((settings) => {
  if (!FEATURES.CONTENT) return;

  let userSettings = settings.userSettings || {};

  if (!FEATURES.CONTENT) {
    console.log('CONTENT is disabled. Not processing the page');
    return;
  }

  const handler = dispatch(window.location, document);

  if (!handler.isEnabled) return;

  try {
    console.log(`Dispatched to content handler ${handler.handlerName}`);
    handler
      .needToTweakLanguages()
      .then((config) => handler.tweakLanguages())
      .catch((e) => {
        if (e === handler.NOOP) {
          console.log(
            `tweakLanguages flow of ${handler.handlerName} returned 'nothing to do'`,
            e
          );
          return;
        }
        reportError(`Error in ${handler.handlerName} content flow`, e);
      });
  } catch (e) {
    reportError(`content.js: fatal error in ${handler.handlerName} flow`, e);
  }
});
