import defaultHandler from './default';

// In Firefox fetch is executed in the context of extension,
// content.fetch - in the content of the page. Hence this hack
// https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Content_scripts
const contextFetch = typeof variable !== 'undefined' ? content.fetch : fetch;

export default class facebookHandler extends defaultHandler {
  handlerName = 'facebook';

  // fb page config requires three requests to fb backend,
  // so cache results for six hours
  targetLanguagesConfigExpiresAfter = 5 * 60; // 6 * 60 * 60;

  SUPPORTED_LANGUAGES() {
    return ['uk'];
  }

  static LANG_MAP = {
    uk: 'uk_UA',
    en: 'en_XX',
    ru: 'ru_RU',
  };

  _tweakLanguagesCTA(languageConfig) {
    return 'Facebook підтримує Українську. Налаштувати?';
  }

  async _getTargetNoTranslateLangs() {
    /*
     * Fetches the "Languages for which you don't
     * want to be offered translations" part of Profile
     */
    const {
      fb_dtsg_match_async,
      user_id_match,
    } = this._get_fb_tstg_and_user_id();
    const $self = this;

    return fetch(
      'https://www.facebook.com/ajax/settings/language/secondary.php' +
        `?fb_dtsg_ag=${fb_dtsg_match_async}&__user=${user_id_match}&__a=1`
    )
      .then((response) => response.text())
      .then((html) => $self._parseNotranslateLanguages(html))
      .catch((e) => {
        // TODO: report an error
        console.log(e);
        return null;
      });
  }

  async _getTargetTranslateLang() {
    /*
     * Fetches the "Language into which you'd
     * like to have posts translated"
     */
    const {
      fb_dtsg_match,
      fb_dtsg_match_async,
      user_id_match,
    } = this._get_fb_tstg_and_user_id();

    return fetch(
      'https://www.facebook.com/ajax/settings/language/primary.php' +
        `?fb_dtsg_ag=${fb_dtsg_match_async}&__user=${user_id_match}&__a=1&__dyn=${fb_dtsg_match_async}`
    )
      .then((response) => response.text())
      .then((html) => {
        const result = [];
        const re = /value=\\*"([^"]+?)\\*" selected=\\*"1\\*"/;
        const translate_to_match = html.match(re);

        if (
          !translate_to_match ||
          translate_to_match[1] !=
            facebookHandler.LANG_MAP[this.moreLanguages[0]]
        ) {
          return this.moreLanguages[0];
        }

        return null;
      })
      .catch((e) => {
        // TODO: report an error
        console.log(e);
        return null;
      });
  }

  async _getTargetDisableAutotranslateLangs() {
    /*
     * Fetches the "Language into which you'd
     * like to have posts translated"
     */
    const {
      fb_dtsg_match,
      fb_dtsg_match_async,
      user_id_match,
    } = this._get_fb_tstg_and_user_id();
    const $self = this;

    return fetch(
      'https://www.facebook.com/ajax/settings/language/disable_autotranslate.php' +
        `?fb_dtsg_ag=${fb_dtsg_match_async}&__user=${user_id_match}&__a=1`
    )
      .then((response) => response.text())
      .then((html) => $self._parseNotranslateLanguages(html))
      .catch((e) => {
        // TODO: report an error
        console.log(e);
        return null;
      });
  }

  async _targetLanguagesConfig() {
    try {
      const profileLink = this.document.querySelector('a[href="/me/"]');
      if (!profileLink) {
        // Not logged in, nothing to do
        return null;
      }

      return Promise.all([
        super._targetLanguagesConfig(),
        this._getTargetTranslateLang(),
        this._getTargetNoTranslateLangs(),
        this._getTargetDisableAutotranslateLangs(),
      ]).then((results) => {
        if (results.filter((r) => r != null).length == 0) {
          return null;
        }
        const [
          uiLangs,
          translateLang,
          noTranslateLangs,
          disableAutotranslateLangs,
        ] = results;

        return {
          uiLangs,
          translateLang,
          noTranslateLangs,
          disableAutotranslateLangs,
        };
      });
    } catch (e) {
      // TODO: reporting
      console.log('Error getting profile settings', e);
    }
  }

  async _changeLanguageTo(languages) {
    try {
      return Promise.all([
        this._changeUILanguageTo(languages.uiLangs),
        this._changeNoTranslateLanguagesTo(languages.noTranslateLangs),
        this._changeTranslateLanguageTo(languages.translateLang),
        this._changeDisableAutotranslateLanguagesTo(
          languages.disableAutotranslateLangs
        ),
      ])
        .then((results) => {
          if (results.filter((r) => r != true).length == 0) {
            return;
          }
          const [
            UILangChangedOK,
            noTranslateLanguagesChangedOk,
            translationsChangedOk,
            disableAutotranslateLanguagesOk,
          ] = results;
          return Promise.reject(
            'One of changeLanguageTo() subcomponents failed',
            results
          );
        })
        .catch((e) => {
          console.log('Error http execution', e);
          return e;
        });
    } catch (e) {
      return Promise.reject(e);
    }
  }

  _get_fb_tstg_and_user_id() {
    if (this['_cached_fb_dtsg']) {
      return this['_cached_fb_dtsg'];
    }

    const doc = new XMLSerializer().serializeToString(this.document);
    // fb_dtsg_match[1] contains fb_dtsg
    const fb_dtsg_match = doc.match(
      /"token":"([^"]+?)","async_get_token":"([^"]+?)"/
    );
    // user_id_match[1] contains user id
    const user_id_match = doc.match(/__user=(\d+)&/);

    this['_cached_fb_dtsg'] = {
      fb_dtsg_match: fb_dtsg_match[1],
      fb_dtsg_match_async: fb_dtsg_match[2],
      user_id_match: user_id_match[1],
    };

    return this['_cached_fb_dtsg'];
  }

  _changeUILanguageTo(uiLanguages) {
    if (!uiLanguages || uiLanguages.length <= 0) {
      return Promise.resolve(true);
    }

    const { fb_dtsg_match, user_id_match } = this._get_fb_tstg_and_user_id();

    const langValue = facebookHandler.LANG_MAP[uiLanguages[0]];
    if (!langValue) {
      throw new Error(`Language ${uiLanguages[0]} is not supported.`);
    }

    const requestOptions = {
      method: 'POST',
      mode: 'cors',
      cache: 'no-cache',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `fb_dtsg=${fb_dtsg_match}&new_language=${langValue}&new_fallback_language=&__user=${user_id_match}`,
    };

    return contextFetch(
      'https://www.facebook.com/ajax/settings/language/account.php',
      requestOptions
    ).then((response) => {
      return true;
    });
  }

  _changeNoTranslateLanguagesTo(dontTranslateLangs) {
    if (!dontTranslateLangs || dontTranslateLangs.length == 0) {
      return Promise.resolve(true);
    }

    const requestOptions = this._tokenizedDialectsToRequestOptions(
      dontTranslateLangs
    );

    return contextFetch(
      'https://www.facebook.com/ajax/settings/language/secondary.php',
      requestOptions
    ).then((response) => {
      return true;
    });
  }
  _changeDisableAutotranslateLanguagesTo(disableAuthtranslateLangs) {
    if (!disableAuthtranslateLangs || disableAuthtranslateLangs.length == 0) {
      return Promise.resolve(true);
    }

    const requestOptions = this._tokenizedDialectsToRequestOptions(
      disableAuthtranslateLangs
    );

    return contextFetch(
      'https://www.facebook.com/ajax/settings/language/disable_autotranslate.php',
      requestOptions
    ).then((response) => {
      return true;
    });
  }

  _changeTranslateLanguageTo(translateLang) {
    if (!translateLang) {
      return Promise.resolve(true);
    }

    const langValue = facebookHandler.LANG_MAP[translateLang];
    if (!langValue) {
      throw new Error(`Language ${translateLang} is not supported.`);
    }

    const {
      fb_dtsg_match_async,
      user_id_match,
      fb_dtsg_match,
    } = this._get_fb_tstg_and_user_id();

    const requestOptions = {
      method: 'POST',
      mode: 'cors',
      cache: 'no-cache',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `fb_dtsg=${fb_dtsg_match}&primary_dialect=${langValue}&__user=${user_id_match}&__a=1`,
    };

    return contextFetch(
      'https://www.facebook.com/ajax/settings/language/primary.php',
      requestOptions
    ).then((response) => {
      return true;
    });
  }

  _parseNotranslateLanguages(html) {
    const result = [];
    const re = /"uniqueID":"(.+?)"/g;

    const lessLanguages = this.lessLanguages
      .map((l) => facebookHandler.LANG_MAP[l])
      .filter((l) => l != null);
    const moreLanguages = this.moreLanguages
      .map((l) => facebookHandler.LANG_MAP[l])
      .filter((l) => l != null);

    let match;

    do {
      match = re.exec(html);
      if (match) {
        result.push(match[1]);
      }
    } while (match);

    const excludeLangs = result.filter((l) => lessLanguages.includes(l));
    const addLangs = moreLanguages.filter((l) => !result.includes(l));

    if (excludeLangs.length > 0) {
      const newConfig = result.filter((l) => !lessLanguages.includes(l));
      newConfig.push(...addLangs);
      return newConfig;
    }
    return null;
  }

  _tokenizedDialectsToRequestOptions(dialects) {
    const {
      fb_dtsg_match_async,
      user_id_match,
      fb_dtsg_match,
    } = this._get_fb_tstg_and_user_id();

    const tokenizedDialects = dialects.map((l) => `%20${l}`).join('');

    const requestOptions = {
      method: 'POST',
      mode: 'cors',
      cache: 'no-cache',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `fb_dtsg=${fb_dtsg_match}&tokenized_dialects=${tokenizedDialects}&__user=${user_id_match}&__a=1`,
    };
    return requestOptions;
  }
}
