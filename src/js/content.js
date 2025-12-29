import '../img/icon-128.png';
import '../img/icon-64.png';
import '../img/icon-32.png';

/// #if PLATFORM != 'SAFARI-IOS'
import browser from 'webextension-polyfill';
/// #endif

console.log('Content loading');
/// #if PLATFORM == 'SAFARI-IOS'
import './ios-safari-fixup';
/// #endif

import { storageGetSync, reportError, FEATURES } from './util';
import { dispatch } from './routing';

browser.runtime.onMessage.addListener((request) => {
  if (
    request.type === 'content' &&
    request.subtype === 'MsgRedirectContentPage'
  ) {
    console.log(`[Content] Redirecting to ${request.url}`);
    window.stop();
    if (request.replacesBrowserHistory) {
      window.location.replace(request.url);
    } else {
      window.location.href = request.url;
    }
    return Promise.resolve(true);
  }
});

storageGetSync('userSettings').then((settings) => {
  if (!FEATURES.CONTENT) {
    console.log('CONTENT is disabled. Not processing the page');
    return;
  }

  let userSettings = settings.userSettings || {};

  const handler = dispatch(window.location, document, userSettings);

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
