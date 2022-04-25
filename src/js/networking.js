import { getExtensionVersion } from './util';
import { v4 as uuidv4 } from 'uuid';
import { storageGetSync, storageSetSync } from './util';
import { serializeError } from 'serialize-error';
import browser from 'webextension-polyfill';

export let API_BASE = process.env.API_BASE_URI;
export let userId;

storageGetSync('userId').then((items) => {
  if (items.userId) {
    userId = items.userId;
  } else {
    userId = uuidv4();
    sendEvent('newUser');
    storageSetSync({ userId: userId }, function () {
      browser.runtime.openOptionsPage();
    });
  }
});

export function sendEvent(type, data) {
  if (process.env.NODE_ENV === 'development') {
    console.log('event', type, data);
  }

  if (!data) {
    data = {};
  }

  const options = {
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      ..._getCommonOptions(),
      type: type,
      data: data,
    }),
    method: 'POST',
  };

  _sendBehavioralInfo('/events', options);
}

export function reportError(desc, errorData, pageviewId) {
  const strError =
    errorData instanceof Error ? serializeError(errorData) : errorData;

  if (process.env.NODE_ENV === 'development') {
    console.error(desc, errorData);
  }

  const options = {
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      ..._getCommonOptions(),
      desc: desc,
      data: strError,
      pageviewId: pageviewId,
    }),
    method: 'POST',
  };

  _sendTechnicalInfo('/error', options);
}

export function removeAffiliateCookie() {
  _sendTechnicalInfo('/remove-affiliate-cookie');
}

function _sendBehavioralInfo(path, options) {
  storageGetSync('userSettings')
    .then((settings) => {
      return settings.userSettings.collectStats
        ? Promise.resolve(true)
        : Promise.reject('collectStats is disabled');
    })
    .then(() => {
      _sendInfo(path, options);
    })
    .catch((error) => {
      if (error === 'collectStats is disabled') {
        console.error('collectStats is disabled: not sending event');
        return;
      }
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to send an event', error);
      }
    });
}

function _sendTechnicalInfo(path, options) {
  _sendInfo(path, options);
}

function _sendInfo(path, options) {
  fetch(API_BASE + path, options)
    .then((data) => {
      if (process.env.NODE_ENV === 'development') {
        console.info('event sent', data);
      }
    })
    .catch((error) => {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to send an event', error);
      }
    });
}

function _getCommonOptions() {
  return {
    userId: userId || 'unknown',
    extension: 'language-settings-manager',
    eventId: uuidv4(),
    version: getExtensionVersion(),
  };
}
