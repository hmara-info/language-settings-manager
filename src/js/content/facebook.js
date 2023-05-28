import defaultHandler from './default';
import { reportError } from '../util';

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
    return ['uk', 'en'];
  }

  // All FB locales for future use
  // {"uk":"uk_UA","en":"en_UD","so":"so_SO","af":"af_ZA","az":"az_AZ","id":"id_ID","ms":"ms_MY","jv":"jv_ID","cx":"cx_PH","bs":"bs_BA","br":"br_FR","ca":"ca_ES","cs":"cs_CZ","co":"co_FR","cy":"cy_GB","da":"da_DK","de":"de_DE","et":"et_EE","es":"es_ES","eo":"eo_EO","eu":"eu_ES","tl":"tl_PH","fo":"fo_FO","fr":"fr_FR","fy":"fy_NL","ff":"ff_NG","fn":"fn_IT","ga":"ga_IE","gl":"gl_ES","gn":"gn_PY","ha":"ha_NG","hr":"hr_HR","rw":"rw_RW","iu":"iu_CA","ik":"ik_US","is":"is_IS","it":"it_IT","sw":"sw_KE","ht":"ht_HT","ku":"ku_TR","lv":"lv_LV","lt":"lt_LT","hu":"hu_HU","mg":"mg_MG","mt":"mt_MT","nl":"nl_BE","nb":"nb_NO","nn":"nn_NO","uz":"uz_UZ","pl":"pl_PL","pt":"pt_PT","ro":"ro_RO","sc":"sc_IT","sn":"sn_ZW","sq":"sq_AL","sz":"sz_PL","sk":"sk_SK","sl":"sl_SI","fi":"fi_FI","sv":"sv_SE","vi":"vi_VN","tr":"tr_TR","zz":"zz_TR","el":"el_GR","be":"be_BY","bg":"bg_BG","ky":"ky_KG","kk":"kk_KZ","mk":"mk_MK","mn":"mn_MN","ru":"ru_RU","sr":"sr_RS","tt":"tt_RU","tg":"tg_TJ","ka":"ka_GE","hy":"hy_AM","he":"he_IL","ur":"ur_PK","ar":"ar_AR","ps":"ps_AF","fa":"fa_IR","cb":"cb_IQ","sy":"sy_SY","tz":"tz_MA","am":"am_ET","ne":"ne_NP","mr":"mr_IN","hi":"hi_IN","as":"as_IN","bn":"bn_IN","pa":"pa_IN","gu":"gu_IN","or":"or_IN","ta":"ta_IN","te":"te_IN","kn":"kn_IN","ml":"ml_IN","si":"si_LK","th":"th_TH","lo":"lo_LA","my":"my_MM","km":"km_KH","ko":"ko_KR","zh":"zh_HK","ja":"ja_KS","uk_UA":"uk","en_GB":"en","so_SO":"so","af_ZA":"af","az_AZ":"az","id_ID":"id","ms_MY":"ms","jv_ID":"jv","cx_PH":"cx","bs_BA":"bs","br_FR":"br","ca_ES":"ca","cs_CZ":"cs","co_FR":"co","cy_GB":"cy","da_DK":"da","de_DE":"de","et_EE":"et","en_US":"en","en_UD":"en","es_LA":"es","es_ES":"es","eo_EO":"eo","eu_ES":"eu","tl_PH":"tl","fo_FO":"fo","fr_CA":"fr","fr_FR":"fr","fy_NL":"fy","ff_NG":"ff","fn_IT":"fn","ga_IE":"ga","gl_ES":"gl","gn_PY":"gn","ha_NG":"ha","hr_HR":"hr","rw_RW":"rw","iu_CA":"iu","ik_US":"ik","is_IS":"is","it_IT":"it","sw_KE":"sw","ht_HT":"ht","ku_TR":"ku","lv_LV":"lv","lt_LT":"lt","hu_HU":"hu","mg_MG":"mg","mt_MT":"mt","nl_NL":"nl","nb_NO":"nb","nn_NO":"nn","uz_UZ":"uz","pl_PL":"pl","pt_BR":"pt","pt_PT":"pt","ro_RO":"ro","sc_IT":"sc","sn_ZW":"sn","sq_AL":"sq","sz_PL":"sz","sk_SK":"sk","sl_SI":"sl","fi_FI":"fi","sv_SE":"sv","vi_VN":"vi","tr_TR":"tr","nl_BE":"nl","zz_TR":"zz","el_GR":"el","be_BY":"be","bg_BG":"bg","ky_KG":"ky","kk_KZ":"kk","mk_MK":"mk","mn_MN":"mn","ru_RU":"ru","sr_RS":"sr","tt_RU":"tt","tg_TJ":"tg","ka_GE":"ka","hy_AM":"hy","he_IL":"he","ur_PK":"ur","ar_AR":"ar","ps_AF":"ps","fa_IR":"fa","cb_IQ":"cb","sy_SY":"sy","tz_MA":"tz","am_ET":"am","ne_NP":"ne","mr_IN":"mr","hi_IN":"hi","as_IN":"as","bn_IN":"bn","pa_IN":"pa","gu_IN":"gu","or_IN":"or","ta_IN":"ta","te_IN":"te","kn_IN":"kn","ml_IN":"ml","si_LK":"si","th_TH":"th","lo_LA":"lo","my_MM":"my","km_KH":"km","ko_KR":"ko","zh_TW":"zh","zh_CN":"zh","zh_HK":"zh","ja_JP":"ja","ja_KS":"ja"}
  static LANG_MAP = {
    uk: 'uk_UA',
    en: 'en_GB',
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
        reportError('fb _getTargetNoTranslateLangs() failed', e);
        return e;
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
        reportError('fb _getTargetTranslateLang() failed', e);
        return e;
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
        reportError('fb _getTargetDisableAutotranslateLangs() failed', e);
        return e;
      });
  }

  async _targetLanguagesConfig() {
    const $self = this;
    const logoutForm = this.document.querySelector('form[action^="/logout"]');
    if (!logoutForm) {
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
        return;
      }
      const [
        uiLangs,
        translateLang,
        noTranslateLangs,
        disableAutotranslateLangs,
      ] = results;
      console.log(results);

      return {
        uiLangs,
        translateLang,
        noTranslateLangs,
        disableAutotranslateLangs,
      };
    });
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
