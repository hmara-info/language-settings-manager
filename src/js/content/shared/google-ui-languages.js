import browser from 'webextension-polyfill';

// This set of functions is to be called from a content process
// with the goal to prepare HTTP requests,
// send to the background process for execution,
// process the response and return relevant results

export async function getGoogleUILangugages(cachedHtml) {
  // Use the cached html when provided
  const fetchDom = cachedHtml
    ? Promise.resolve(cachedHtml)
    : browser.runtime.sendMessage({
        type: 'content',
        subtype: 'MsgGetGoogleAccountLanguages',
      });

  fetchDom.then((html) => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      // Returns "Preferred languages" in format ['uk', 'en-NL'], sorted by priority
      const googleLangs = [...doc.querySelectorAll('.GqRghe .mMsbvc > label')]
        .map((node) => node.getAttribute('lang'))
        .filter((lang) => lang);

      // Now check if Google Profile languages match
      // TODO: fetch a list of languages assumed by Google
      const match = html.match(
        /https:\\\/\\\/www\.google\.com\\\/settings','(.*?)'/
      );
      if (!match) {
        throw new Error('No "at" value found in DOM');
      }
      const settingsAt = match[1];

      return Promise.resolve({ googleLangs, settingsAt });
    } catch (e) {
      console.error(e);
      return Promise.reject('Could not get Google UI languages: ' + e);
    }
  });
}

// Takes a data structure returned by getGoogleUILangugages
export async function setGoogleUILangugages(settings) {
  if (!settings || !settings.settingsAt) {
    return;
  }
  const formEncode = function (data) {
    var formBody = [];
    for (const property in data) {
      const encodedKey = encodeURIComponent(property);
      const encodedValue = encodeURIComponent(data[property]);
      formBody.push(encodedKey + '=' + encodedValue);
    }
    return formBody.join('&');
  };

  // Example payload: f.req=[["uk"]]&at=AGM9kOYuAHoYlyx1LLunsOPC-EVj:16J1479455245&
  const setAccountLangsData = {
    'f.req': JSON.stringify([settings.googleLangs]),
    at: settings.settingsAt,
  };

  // A static request to disable language autodetection
  const disableAutodetectLangsData = {
    'f.req': JSON.stringify([[['NeP2w', '[2]', null, 'generic']]]),
    at: settings.settingsAt,
  };

  return Promise.all([
    // calls setGoogleUILangugagesRequest(body) in the background process
    browser.runtime.sendMessage({
      type: 'content',
      subtype: 'MsgSetGoogleAccountLanguages',
      body: formEncode(setAccountLangsData),
    }),

    // calls disableGoogleUILangugagesAutosuggestRequest() in the background process
    browser.runtime.sendMessage({
      type: 'content',
      subtype: 'MsgDisableGoogleAccountAutosuggestLanguages',
      body: formEncode(disableAutodetectLangsData),
    }),
  ]).then(([setLanguagesResult, disableAutosuggestionsResult]) => {
    return setLanguagesResult;
  });
}

// This is a set of functions is to be run in the background process

// Takes a data structure returned by getGoogleUILangugages
// Disables auto-suggestions of languages by Google
// as it's known to suggest undesired languages without confirming with the user
export async function disableGoogleUILangugagesAutosuggestRequest(body) {
  return fetch(
    'https://myaccount.google.com/_/AccountSettingsUi/data/batchexecute',
    {
      headers: {
        'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
      },
      body: body,
      credentials: 'include',
      method: 'POST',
    }
  );
}

// Posts a provided body with an intent to set preferred languages for Google Account
export async function setGoogleUILangugagesRequest(body) {
  return fetch('https://myaccount.google.com/_/language_update', {
    headers: {
      'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
    },
    body: body,
    credentials: 'include',
    method: 'POST',
  }).then((response) => {
    if (response.status == 200) {
      return Promise.resolve(response.status);
    } else {
      return Promise.reject({ status: response.status, reason: response.text });
    }
  });
}

export async function getGoogleUILangugagesRequest() {
  return fetch('https://myaccount.google.com/language', {
    credentials: 'include',
  }).then((r) => r.text());
}
