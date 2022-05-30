import { sendEvent, reportError } from './networking';
import { storageGetSync, storageGet } from './util';
import browser from 'webextension-polyfill';
import setupGoogleRewrite from './google-rewrite';

let config;

browser.runtime.onInstalled.addListener(function (details) {
  // This needs to be the same for Chrome, FF and everybody else
  sendEvent(`installed: ${details.reason}`);
});

if (process.env.NODE_ENV === 'development') {
  // Configuration override in development goes here
  // chrome.storage.local.set({});
}

try {
  setupMessaging();

  checkConfigured();
  setupNotifications();
} catch (e) {
  reportError('background.js', e);
}

function setupMessaging() {
  // Incoming messages
  browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    try {
      switch (request.type) {
        case 'options':
          handleOptionsRequest(request);
          break;

        case 'savedLanguageChoice':
          handleSavedLanguageChoice(request);
          break;

        case 'content':
          handleContentRequest(request);
        default:
          reportError(
            `-> background messages from '${request.src}' are not supported`
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

function handleSavedLanguageChoice(request) {
  syncLanguagesConfig().then(function () {
    // console.log('Synced config');
  });
}

function handleOptionsRequest(request) {
  switch (request.type) {
    case 'MsgOptionsToBackgroundOne':
      break;

    default:
      reportError(
        `-> background messages from options '${request.type}' are not supported`
      );
  }
}

function handleContentRequest(request) {
  switch (request.type) {
    case 'MsgContentToBackgroundOne':
      break;

    default:
      reportError(
        `-> background messages from content '${request.type}' are not supported`
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

    browser.notifications.onButtonClicked.addListener(function (
      notifId,
      btnIdx
    ) {
      if (notifId === 'PleaseSetUp') {
        browser.runtime.openOptionsPage();
      }
    });
  } catch (e) {
    console.log('Failed to set up notification events', e);
  }
}

function checkConfigured() {
  storageGetSync('userSettings').then((data) => {
    if (!data.userSettings) {
      try {
        browser.notifications.create('PleaseSetUp', {
          title: 'Лагідна Українізація',
          message:
            'Вкажіть, які мови ви хочете бачити більше в Інтернет, будь ласка. Натисніть на це повідомлення',
          iconUrl: '/icon-128.png',
          type: 'basic',
          buttons: [
            {
              title: 'Перейти до налаштуваннь',
            },
          ],
        });
      } catch (e) {
        console.log('Failed to create notification', e);
      }
    } else {
      setupGoogleRewrite();
    }
  });
}
