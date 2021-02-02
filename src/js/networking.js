import { getExtensionVersion } from './util';
import Bottleneck from 'bottleneck';
import { v4 as uuidv4 } from 'uuid';
import { storageGetSync, storageSetSync } from './util';

export let API_BASE = process.env.API_BASE_URI;
export let userId;

storageGetSync('userId').then((items) => {
  if (items.userId) {
    userId = items.userId;
  } else {
    userId = uuidv4();
    sendEvent('newUser');
    storageSetSync({ userId: userId }, function () {
      chrome.runtime.openOptionsPage();
    });
  }
});

const bottleneck = new Bottleneck({
  reservoir: 50,
  reservoirIncreaseMaximum: 50,
  reservoirIncreaseAmount: 1,
  reservoirIncreaseInterval: 3000,
  maxConcurrent: 1,
  highWater: 20,
  strategy: Bottleneck.strategy.OVERFLOW,
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

  _sendStats('/events', options);
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

  _sendStats('/error', options);
}

function _sendStats(path, options) {
  storageGetSync('userSettings')
    .then((settings) => {
      return settings.userSettings.collectStats
        ? Promise.resolve(true)
        : Promise.reject('collectStats is disabled');
    })
    .then(() => {
      return bottleneck.schedule(() => fetch(API_BASE + path, options));
    })
    .then((data) => {
      if (process.env.NODE_ENV === 'development') {
        console.info('event sent', data);
      }
    })
    .catch((error) => {
      if (process.env.NODE_ENV === 'development') {
        if (error === 'collectStats is disabled') {
          console.error('collectStats is disabled: not sending event');
          return;
        }

        console.error('Failed to send an event', error);
      }
    });
}

function _getCommonOptions() {
  return {
    userId: userId || 'unknown',
    eventId: uuidv4(),
    version: getExtensionVersion(),
  };
}
