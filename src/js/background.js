import { sendEvent, reportError } from './networking';
import { storageGetSync, storageGet } from './util';
import browser from 'webextension-polyfill';

let config;

chrome.runtime.onInstalled.addListener(function (details) {
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
} catch (e) {
  reportError('background.js', e);
}

function setupMessaging() {
  // Incoming messages
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    try {
      switch (request.src) {
        case 'options':
          handleOptionsRequest(request);
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
  chrome.notifications.onClicked.addListener(function (notifId) {
    if (notifId === 'PleaseSetUp') {
      chrome.runtime.openOptionsPage();
    }
  });
}

function checkConfigured() {
  storageGetSync('userSettings').then((data) => {
    if (!data.userSettings) {
      chrome.notifications.create('PleaseSetUp', {
        title: 'Українська мова в Google',
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
    }
  });
}

function googleSearchRequestListner(details) {
  if (!details.url) {
    return;
  }

  const url = new URL(details.url);
  const params = url.searchParams;
  const lrValues = params.getAll('lr');
  return storageGetSync('userSettings').then((settings) => {
    const userSettings = settings.userSettings;
    if (!userSettings) return;

    const lessLanguages = userSettings.lessLanguages;
    if (!lessLanguages || !lessLanguages.length) return;
    const needToFilterLanguages = lessLanguages.filter((lang) => {
      const value = `-lang_${lang}`;
      return !lrValues.includes(value);
    });
    if (!needToFilterLanguages.length) {
      return;
    }

    for (let lang of needToFilterLanguages) {
      url.searchParams.append('lr', `-lang_${lang}`);
    }
    return {
      redirectUrl: url.toString(),
    };
  });
}

browser.webRequest.onBeforeRequest.addListener(
  googleSearchRequestListner,
  {
    urls: ['https://www.google.com/search?*'],
  },
  ['blocking']
);
