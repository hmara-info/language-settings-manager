import { sendEvent, reportError } from './networking';
import { storageGetSync, storageGet } from './util';
import browser from 'webextension-polyfill';
import setupGoogleRewrite from './google-rewrite';
import {
  getGoogleUILangugagesRequest,
  setGoogleUILangugagesRequest,
} from './content/shared/google-ui-languages';

let config;

console.log('Loaded background.js');

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
  browser.runtime.onMessage.addListener((request, sender) => {
    try {
      switch (request.type) {
        case 'options':
          return handleOptionsRequest(request);

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

function handleOptionsRequest(request) {
  switch (request.subtype) {
    case 'MsgOptionsToBackgroundOne':
      break;

    default:
      reportError(
        `-> background messages from content '${request.type}' of subtype '${request.subtype}' are not supported`
      );
  }
}

function handleContentRequest(request, sender) {
  switch (request.subtype) {
    case 'MsgGetGoogleAccountLanguages':
      return getGoogleUILangugagesRequest();

    case 'MsgSetGoogleAccountLanguages':
      return setGoogleUILangugagesRequest(request.languages);

    case 'MsgReportError':
      return reportError(request.desc, request.errorData);

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

    browser.notifications.onButtonClicked.addListener(function (
      notifId,
      btnIdx
    ) {
      if (notifId === 'PleaseSetUp') {
        browser.runtime.openOptionsPage();
      }
    });
  } catch (e) {
    reportError('Failed to set up notification events', e);
  }
}

function checkConfigured() {
  storageGetSync('userSettings').then((data) => {
    if (!data.userSettings) {
      console.log('User settings not found. Setting up notification');
      try {
        browser.notifications
          .create('PleaseSetUp', {
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
          })
          .catch((e) => reportError('Failed to create the notification', e));
      } catch (e) {
        reportError('Failed to create notification', e);
      }
    } else {
      console.log('Loaded user settings. Setting up google rewrite');
      setupGoogleRewrite();
    }
  });
}
