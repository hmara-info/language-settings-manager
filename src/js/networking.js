import { getExtensionVersion, storageSet } from './util';
import { v4 as uuidv4 } from 'uuid';
import { storageGetSync, storageSetSync, FEATURES } from './util';
import { serializeError } from 'serialize-error';
import browser from 'webextension-polyfill';

export let API_BASE = process.env.API_BASE_URI;
export let userId;

export const PLATFORM =
  /// #if PLATFORM == 'FIREFOX'
  'firefox';
/// #elif PLATFORM == 'CHROME'
('chrome');
/// #elif PLATFORM == 'SAFARI'
('safari');
/// #elif PLATFORM == 'SAFARI-IOS'
('safari-ios');
/// #else
('unknown');
/// #endif

storageGetSync('userId').then((items) => {
  if (items.userId) {
    userId = items.userId;
  } else {
    userId = uuidv4();
    storageSetSync({ userId: userId }, function () {
      browser.runtime.openOptionsPage();
    });
  }
});

export function sendEvent(type, data) {
  console.log('sending event', type, data);

  if (!data) {
    data = {};
  }
  const body = { type, data };
  return _sendJSON('/events', body);
}

export function reportError(desc, errorData) {
  const strError =
    errorData instanceof Error ? serializeError(errorData) : errorData;

  console.log('sending error', desc, strError);

  _sendJSON('/error', { desc: desc, data: strError });
}

function _sendJSON(path, body) {
  let newUser = false;
  storageGetSync('userSettings')
    .then((settings) => {
      if (
        !settings ||
        !settings.userSettings ||
        !settings.userSettings.collectStats
      ) {
        return Promise.reject('collectStats is disabled');
      }

      return settings;
    })
    .then((settings) => {
      const userSettingsCp = { ...settings.userSettings };
      delete userSettingsCp['collectStats'];
      delete userSettingsCp['is_18'];

      const options = {
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...body,
          userId: userId || 'unknown',
          eventId: uuidv4(),
          version: getExtensionVersion(),
          platform: PLATFORM,
          userSettings: userSettingsCp,
        }),
        method: 'POST',
      };

      return _sendInfo(path, options);
    })
    .then((response) => {
      if (response.status !== 200) {
        return Promise.reject({
          error: 'Could not send JSON',
          status: response.status,
        });
      }
      return 1;
    })
    .catch((error) => {
      if (error === 'collectStats is disabled') {
        return;
      }
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to send an event', error);
      }
    });
}

function _sendInfo(path, options) {
  return fetch(API_BASE + path, options)
    .then((r) => {
      if (process.env.NODE_ENV === 'development') {
        console.info('event sent', data);
      }
      return r;
    })
    .catch((error) => {
      console.log('Failed to send an event', error);
    });
}

export async function updateLocalFeatures() {
  if (!navigator.onLine) return;
  const env = process.env.NODE_ENV;

  const path = `/features/${getExtensionVersion()}-${PLATFORM}.json`;

  return fetch(API_BASE + path)
    .then((r) => r.json())
    .then((json) => {
      if (!json || Object.keys(json) <= 0) {
        return;
      }
      const missingFeatures = [];
      for (const k of FEATURES) {
        if ((!k) in json) {
          missingFeatures.push(k);
        }
      }
      if (missingFeatures.length) {
        reportError(
          `Incomplete featureset received from ${path}. Missing keys: ` +
            missingFeatures.sort().join(', ')
        );
        return;
      }
      FEATURES = json;
      storageSet({ features: json });
    });
}
