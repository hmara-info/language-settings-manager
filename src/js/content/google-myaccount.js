import defaultHandler from './default';
import { reportError } from '../networking';

export default class googleMyaccountHandler extends defaultHandler {
  handlerName = 'google-myaccount';

  preferencesUrl = 'https://myaccount.google.com/language';

  SUPPORTED_LANGUAGES() {
    return ['uk', 'en'];
  }

  HTML_LANG_MAP = {
    uk: 'uk',
    en: 'en-GB',
  };

  COOKIE_LANG_MAP = {
    uk: 'uk',
  };

  _tweakLanguagesCTA(languageConfig) {
    return 'Інтерфейси Google підтримують Українську. Налаштувати?';
  }

  async _targetLanguagesConfig() {
    console.log('Lang map1', this);
    const $self = this;
    const moreLanguages = $self.moreLanguages;
    const supportedWantedLanguages = $self
      .SUPPORTED_LANGUAGES()
      .filter((value) => moreLanguages.includes(value));

    if (supportedWantedLanguages.length == 0) return null;

    console.log('Fetch dom at ' + $self.location.href);
    let fetchDom;
    if ($self.location.href === 'https://myaccount.google.com/language') {
      console.log('Cached dom');
      fetchDom = new Promise((r) =>
        r({
          dom: $self.document,
          html: $self.document.documentElement.innerHTML,
        })
      );
    } else {
      console.log('Live fetched dom');
      fetchDom = fetch($self.preferencesUrl, {
        credentials: 'same-origin',
      })
        .then((r) => r.text())
        .then((html) => {
          try {
            const parser = new DOMParser();
            return {
              dom: parser.parseFromString(html, 'text/html'),
              html: html,
            };
          } catch (e) {
            console.error(e);
            return Promise.reject('Could not get Google UI languages: ' + e);
          }
        });
    }
    console.log('Proceed with dom');

    return fetchDom
      .then((data) => {
        console.log('Got dom');
        const preferredLangs = [
          ...data.dom.querySelectorAll('.GqRghe .mMsbvc > span'),
        ].map((node) => node.getAttribute('lang'));

        console.log('Langs', preferredLangs);
        // TODO: fetch a list of languages assumed by Google

        // Filter out all undesired languages first
        let newConfig = preferredLangs.filter(
          (lang) =>
            $self.lessLanguages.indexOf(
              lang.replace(/-.*/, '').toLowerCase()
            ) === -1
        );
        console.log('Lang map', $self.HTML_LANG_MAP);

        // Add missing languages
        for (const lang of $self.moreLanguages.reverse()) {
          if (
            $self.HTML_LANG_MAP[lang] &&
            newConfig.indexOf($self.HTML_LANG_MAP[lang]) === -1
          ) {
            newConfig.unshift($self.HTML_LANG_MAP[lang]);
          }
        }

        // Get user preferred languages on top
        // Highly inefficient CPU wise, will do alr with the sizes of these arrays
        newConfig = newConfig.sort((a, b) => {
          return (
            $self.moreLanguages.indexOf(b.replace(/-.*/, '').toLowerCase()) -
            $self.moreLanguages.indexOf(a.replace(/-.*/, '').toLowerCase())
          );
        });

        console.log('New config', newConfig);

        // No tweaks to the config needed
        if (JSON.stringify(newConfig) === JSON.stringify(preferredLangs)) {
          return null;
        }

        const match = data.html.match(
          /https:\\\/\\\/www\.google\.com\\\/settings','(.*?)'/
        );
        if (!match) {
          throw new Error('No "at" value found in DOM');
        }
        const settingsAt = match[1];
        // Structure to be used as targetLanguagesConfig
        // "Preferred languages" in format ['uk', 'en-NL'], sorted by priority
        return { preferredLangs: newConfig, settingsAt: settingsAt };
      })
      .catch((e) => {
        console.log('Error', e);
      });
  }

  async _changeLanguageTo(config) {
    // Disable auto-suggestions of languages first
    const data = {
      'f.req': JSON.stringify([[['NeP2w', '[2]', null, 'generic']]]),
      at: config.settingsAt,
    };
    var formBody = [];
    for (const property in data) {
      const encodedKey = encodeURIComponent(property);
      const encodedValue = encodeURIComponent(data[property]);
      formBody.push(encodedKey + '=' + encodedValue);
    }

    return (
      // Disable auto-suggestions of languages first
      fetch(
        'https://myaccount.google.com/_/AccountSettingsUi/data/batchexecute',
        {
          headers: {
            'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
          },
          body: formBody.join('&'),
          credentials: 'same-origin',
          method: 'POST',
        }
      )
        // Do the actual config change now
        .then((r) => {
          // Example payload: f.req=[["uk"]]&at=AGM9kOYuAHoYlyx1LLunsOPC-EVj:16J1479455245&
          const data = {
            'f.req': JSON.stringify([config.preferredLangs]),
            at: config.settingsAt,
          };
          var formBody = [];
          for (const property in data) {
            const encodedKey = encodeURIComponent(property);
            const encodedValue = encodeURIComponent(data[property]);
            formBody.push(encodedKey + '=' + encodedValue);
          }
          const setPreferencesUrl =
            'https://myaccount.google.com/_/language_update';
          const options = {
            headers: {
              'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
            },
            body: formBody.join('&'),
            credentials: 'same-origin',
            method: 'POST',
          };

          return fetch(setPreferencesUrl, options);
        })
        .then((response) => {
          console.log('fetched', response);
          if (response.status == 200) {
            return Promise.resolve(response.status);
          } else {
            return Promise.reject({
              status: response.status,
              reason: response.text,
            });
          }
        })
    );
  }
}
