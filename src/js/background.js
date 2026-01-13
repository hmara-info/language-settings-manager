import { sendEvent, reportError, updateLocalFeatures } from './networking';
import { storageGetSync, FEATURES, updateRuntimeFeatures } from './util';
import browser from 'webextension-polyfill';
import setupGoogleRewrite from './google-rewrite';
import {
  getGoogleUILangugagesRequest,
  setGoogleUILangugagesRequest,
} from './content/shared/google-ui-languages';
import { trackAchievement } from './achievements';

browser.runtime.onInstalled.addListener(function (details) {
  // This needs to be the same for Chrome, FF and everybody else
  sendEvent(`installed: ${details.reason}`);

  /// #if PLATFORM == 'SAFARI' || PLATFORM == 'SAFARI-IOS'
  // Open options page on first install so user can configure the extension
  if (details.reason === 'install') {
    browser.runtime.openOptionsPage();
  }
  /// #endif
});

/// #if PLATFORM == 'CHROME'
browser.action.onClicked.addListener(() => {
  browser.runtime.openOptionsPage();
});
/// #endif

/// #if PLATFORM == 'FIREFOX'
browser.browserAction.onClicked.addListener(() => {
  if (navigator.userAgent.toLowerCase().includes('android')) {
    // Firefox Android has a bug in openOptionsPage()
    // create a tab instead
    // https://bugzilla.mozilla.org/show_bug.cgi?id=1795449
    return browser.tabs.create({
      url: browser.runtime.getURL('options.html'),
    });
  }
  browser.runtime.openOptionsPage();
});
/// #endif

/// #if PLATFORM == 'SAFARI' || PLATFORM == 'SAFARI-IOS'
browser.browserAction.onClicked.addListener(() => {
  browser.runtime.openOptionsPage();
});
/// #endif

if (process.env.NODE_ENV === 'development') {
  // Configuration override in development goes here
  // chrome.storage.local.set({});
  /// #if PLATFORM == 'CHROME'
  if (chrome.declarativeNetRequest.onRuleMatchedDebug) {
    chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((e) => {
      console.log(`Rewriting ${e.request.url} with 'lr'`);
    });
  }
  /// #endif
}

updateLocalFeatures()
  .then(() => updateRuntimeFeatures())
  .catch(() => {
    // On error keep the existing features in tact.
    // This will fall back to the hardcoded feature set on browser restart
  })
  .then(() => {
    setupMessaging();

    /// #if PLATFORM != 'SAFARI' && PLATFORM != 'SAFARI-IOS'
    // Notifications API is not available on Safari at the moment
    if (FEATURES.NOTIFICATIONS) {
      setupNotifications();
      checkConfigured();
    }
    /// #endif
  })
  .catch((e) => {
    reportError('background.js', e);
  });

function setupMessaging() {
  // Incoming messages
  browser.runtime.onMessage.addListener((request, sender) => {
    try {
      switch (request.type) {
        case 'content':
          return handleContentRequest(request, sender);

        default:
          reportError(
            `-> background messages from '${request.src}' of type '${request.type}' are not supported`
          );
      }
    } catch (e) {
      reportError(
        `-> background message from ${request.src} type '${request.type}': error in handler`,
        e
      );
    }
    return false;
  });
}

function handleContentRequest(request, sender) {
  switch (request.subtype) {
    case 'MsgGetGoogleAccountLanguages':
      return getGoogleUILangugagesRequest();

    case 'MsgSetGoogleAccountLanguages':
      return setGoogleUILangugagesRequest(request.languages);

    case 'MsgReportError':
      return reportError(request.desc, request.errorData);

    case 'MsgAchievementUnlocked':
      return trackAchievement(request.acKey, request.options);

    default:
      reportError(
        `-> background messages from content '${request.type}' of subtype '${request.subtype}' are not supported`
      );
  }
}

function setupNotifications() {
  try {
    browser.notifications.onClicked.addListener(function (notifId) {
      if (notifId === 'PleaseSetUp') {
        browser.runtime.openOptionsPage();
      }
    });

    /// #if PLATFORM != 'FIREFOX'
    // Firefox doesn't support buttons
    browser.notifications.onButtonClicked.addListener(
      function (notifId, btnIdx) {
        if (notifId === 'PleaseSetUp') {
          browser.runtime.openOptionsPage();
        }
      }
    );
    /// #endif
  } catch (e) {
    reportError('Failed to set up notification events', e);
  }
}

function checkConfigured() {
  storageGetSync('userSettings').then(async (data) => {
    if (data.userSettings) {
      return;
    }

    console.log('User settings not found. Setting up notification');

    try {
      browser.notifications.create('PleaseSetUp', {
        title: 'Лагідна Українізація',
        message:
          'Вкажіть, які мови ви хочете бачити більше в Інтернет, будь ласка. Натисніть на це повідомлення',
        iconUrl: '/icon-128.png',
        type: 'basic',
        /// #if PLATFORM != 'FIREFOX'
        // Firefox doesn't support buttons
        buttons: [
          {
            title: 'Перейти до налаштуваннь',
          },
        ],
        /// #endif
      });
    } catch (e) {
      reportError('Failed to create notification', e);
    }
  });
}
