export async function getGoogleUILangugages() {
  const preferencesUrl = 'https://myaccount.google.com/language';
  return fetch(preferencesUrl, {
    credentials: 'same-origin',
  })
    .then((r) => r.text())
    .then((html) => {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        // Returns "Preferred languages" in format ['uk', 'en-NL'], sorted by priority
        const preferredLangs = document
          .querySelectorAll('.GqRghe .mMsbvc > span')
          .map((node) => node.getAttribute('lang'));

        // TODO: fetch a list of languages assumed by Google

        const match = html.match(
          /https:\\\/\\\/www\.google\.com\\\/settings','(.*?)'/
        );
        if (!match) {
          throw new Error('No "at" value found in DOM');
        }
        const settingsAt = match[1];
        return Promise.resolve({ preferredLangs, settingsAt });
      } catch (e) {
        console.error(e);
        return Promise.reject('Could not get Google UI languages: ' + e);
      }
    });
}

// Takes a data strqacture returned by getGoogleUILangugages
export async function setGoogleUILangugages(settings) {
  // Example payload: f.req=[["uk"]]&at=AGM9kOYuAHoYlyx1LLunsOPC-EVj:16J1479455245&
  const data = {
    'f.req': JSON.stringify([settings.preferredLangs.map((x) => [x])]),
    at: settings.settingsAt,
  };
  var formBody = [];
  for (const property in data) {
    const encodedKey = encodeURIComponent(property);
    const encodedValue = encodeURIComponent(details[property]);
    formBody.push(encodedKey + '=' + encodedValue);
  }
  const setPreferencesUrl = 'https://myaccount.google.com/_/language_update';
  const options = {
    headers: {
      'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
    },
    body: formBody.join('&'),
    credentials: 'same-origin',
    method: 'POST',
  };
  return fetch(preferencesUrl, options).then((response) => {
    if (response.status == 200) {
      return Promise.resolve(response.status);
    } else {
      return Promise.reject({ status: response.status, reason: response.text });
    }
  });
}
