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

  return fetchDom.then((html) => {
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
    if (!match || !match[1]) {
      throw new Error('No "at" value found on Google Account page');
    }
    const settingsAt = match[1];

    return Promise.resolve({ googleLangs, settingsAt });
  });
}

// Takes a data structure returned by getGoogleUILangugages
export async function setGoogleUILangugages(settings) {
  console.log('-> setGoogleUILangugagesRequest', settings);
  if (!settings || !settings.settingsAt || !settings.googleLangs) {
    console.log('Malformed config at setGoogleUILangugagesRequest', settings);
    return;
  }

  // calls setGoogleUILangugagesRequest(body) in the background process
  return browser.runtime.sendMessage({
    type: 'content',
    subtype: 'MsgSetGoogleAccountLanguages',
    languages: settings.googleLangs,
  });
}

// setGoogleUILangugagesRequest() is meant to be invoked from the background process

export async function setGoogleUILangugagesRequest(newGoogleLangs) {
  console.log(
    '-> setGoogleUILangugagesRequest(newGoogleLangs)',
    newGoogleLangs
  );
  if (!newGoogleLangs || !newGoogleLangs.length) {
    throw new Error(
      'setGoogleUILangugagesRequest error: No languages provided',
      newGoogleLangs
    );
  }

  return getGoogleUILangugagesRequest()
    .then((html) => {
      console.log(
        '   Received UI languages HTML at setGoogleUILangugagesRequest'
      );
      const match = html.match(
        /https:\\\/\\\/www\.google\.com\\\/settings','(.*?)'/
      );
      if (!match) {
        throw new Error('No "at" value found in DOM');
      }
      return match[1];
    })
    .then((settingsAt) => {
      console.log(
        '   Found "at" value at setGoogleUILangugagesRequest',
        settingsAt
      );
      // Example payload: f.req=[["uk", "en-NL"]]&at=AGM9kOYuAHoYlyx1LLunsOPC-EVj:16J1479455245&
      const setAccountLangsBody = _formEncode({
        'f.req': JSON.stringify([newGoogleLangs]),
        at: settingsAt,
      });

      const disableAutodetectLangsBody = _formEncode({
        'f.req': JSON.stringify([[['NeP2w', '[2]', null, 'generic']]]),
        at: settingsAt,
      });

      const setAllLangsBody = _formEncode({
        at: settingsAt,
      });

      return Promise.all([
        // Updates google account languages according to the config
        fetch('https://myaccount.google.com/_/language_update', {
          headers: {
            'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
          },
          body: setAccountLangsBody,
          credentials: 'include',
          method: 'POST',
        }),

        // Disables auto-suggestions of languages by Google
        // as it's known to suggest undesired languages without confirming with the user
        // It looks like Google requires a small delay between the two operations for batchexecute to work
        new Promise((resolve) => setTimeout(resolve, 500)).then(async () =>
          fetch(
            'https://myaccount.google.com/_/AccountSettingsUi/data/batchexecute',
            {
              headers: {
                'content-type':
                  'application/x-www-form-urlencoded;charset=UTF-8',
              },
              body: disableAutodetectLangsBody,
              credentials: 'include',
              method: 'POST',
            }
          )
        ),

        new Promise((resolve) => setTimeout(resolve, 1000)).then(async () =>
          fetch('https://myaccount.google.com/_/language_remove_override', {
            headers: {
              'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
            },
            body: setAllLangsBody,
            credentials: 'include',
            method: 'POST',
          })
        ),
      ]).then((responses) => {
        console.log(
          '   All requests complete at setGoogleUILangugagesRequest',
          responses
        );
        // Only consider the response to 'update languages' request
        if (responses[0].status == 200) {
          return Promise.resolve(responses[0].status);
        } else {
          return Promise.reject({
            status: responses[0].status,
            reason: responses[0].text,
          });
        }
      });
    });
}

export async function getGoogleUILangugagesRequest() {
  return fetch('https://myaccount.google.com/language', {
    credentials: 'include',
  }).then((r) => r.text());
}

function _formEncode(data) {
  var formBody = [];
  for (const property in data) {
    const encodedKey = encodeURIComponent(property);
    const encodedValue = encodeURIComponent(data[property]);
    formBody.push(encodedKey + '=' + encodedValue);
  }
  return formBody.join('&');
}
