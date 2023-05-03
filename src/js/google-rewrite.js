import browser from 'webextension-polyfill';
import { storageGetSync, reportError } from './util';

let lessLanguages;
let moreLanguages;
let userSpeed;

export default function setupGoogleRewrite() {}

syncLanguagesConfig();

browser.storage.onChanged.addListener(syncLanguagesConfig);
async function syncLanguagesConfig() {
  console.log('Loading languages config');
  return storageGetSync('userSettings')
    .then((settings) => {
      const userSettings = settings.userSettings;
      if (!userSettings || Object.keys(userSettings) == null) return;
      if (
        JSON.stringify([
          userSettings.lessLanguages,
          userSettings.moresLanguages,
        ]) === JSON.stringify([lessLanguages, moreLanguages])
      )
        return;

      lessLanguages = userSettings.lessLanguages;
      moreLanguages = userSettings.moreLanguages;
      userSpeed = userSettings.speed;
      return userSettings;
    })
    .catch((e) => {
      reportError('Error fetching userSettings', e);
    })
    .then((userSettings) => {
      if (!userSettings) return;

      /// #if PLATFORM == 'FIREFOX'
      return firefoxSetupDynamicRewriteRules(userSettings);
      /// #endif

      /// #if PLATFORM == 'CHROME' || PLATFORM == 'SAFARI'
      return chromeSetupDynamicRewriteRules(userSettings);
      /// #endif
    })
    .catch((e) => {
      reportError('Error setting up dynamic rewrite rules', e);
    });
}

/// #if PLATFORM == 'FIREFOX'

function firefoxGoogleSearchRequestListner(details) {
  if (!details.url || !lessLanguages || !lessLanguages.length) {
    return;
  }

  const url = new URL(details.url);
  const params = url.searchParams;
  const filterValue =
    '(-' + lessLanguages.map((lang) => `lang_${lang})`).join('.');

  if (url.searchParams.get('lr') == filterValue) {
    return;
  }

  url.searchParams.set('lr', filterValue);
  return {
    redirectUrl: url.toString(),
  };
}

function firefoxGoogleAutocompleteRequestListner(details) {
  if (!details.url) {
    return;
  }

  const url = new URL(details.url);
  url.hostname = 'gs.hmara.info';

  return {
    redirectUrl: url.toString(),
  };
}

async function firefoxSetupDynamicRewriteRules() {
  console.log('Setting up firefox-alike dynamic rewrite rules');
  browser.webRequest.onBeforeRequest.addListener(
    firefoxGoogleSearchRequestListner,
    {
      urls: [
        'https://www.google.com/search?*',
        'https://www.google.ad/search?*',
        'https://www.google.ae/search?*',
        'https://www.google.com.af/search?*',
        'https://www.google.com.ag/search?*',
        'https://www.google.com.ai/search?*',
        'https://www.google.al/search?*',
        'https://www.google.am/search?*',
        'https://www.google.co.ao/search?*',
        'https://www.google.com.ar/search?*',
        'https://www.google.as/search?*',
        'https://www.google.at/search?*',
        'https://www.google.com.au/search?*',
        'https://www.google.az/search?*',
        'https://www.google.ba/search?*',
        'https://www.google.com.bd/search?*',
        'https://www.google.be/search?*',
        'https://www.google.bf/search?*',
        'https://www.google.bg/search?*',
        'https://www.google.com.bh/search?*',
        'https://www.google.bi/search?*',
        'https://www.google.bj/search?*',
        'https://www.google.com.bn/search?*',
        'https://www.google.com.bo/search?*',
        'https://www.google.com.br/search?*',
        'https://www.google.bs/search?*',
        'https://www.google.bt/search?*',
        'https://www.google.co.bw/search?*',
        'https://www.google.by/search?*',
        'https://www.google.com.bz/search?*',
        'https://www.google.ca/search?*',
        'https://www.google.cd/search?*',
        'https://www.google.cf/search?*',
        'https://www.google.cg/search?*',
        'https://www.google.ch/search?*',
        'https://www.google.ci/search?*',
        'https://www.google.co.ck/search?*',
        'https://www.google.cl/search?*',
        'https://www.google.cm/search?*',
        'https://www.google.cn/search?*',
        'https://www.google.com.co/search?*',
        'https://www.google.co.cr/search?*',
        'https://www.google.com.cu/search?*',
        'https://www.google.cv/search?*',
        'https://www.google.com.cy/search?*',
        'https://www.google.cz/search?*',
        'https://www.google.de/search?*',
        'https://www.google.dj/search?*',
        'https://www.google.dk/search?*',
        'https://www.google.dm/search?*',
        'https://www.google.com.do/search?*',
        'https://www.google.dz/search?*',
        'https://www.google.com.ec/search?*',
        'https://www.google.ee/search?*',
        'https://www.google.com.eg/search?*',
        'https://www.google.es/search?*',
        'https://www.google.com.et/search?*',
        'https://www.google.fi/search?*',
        'https://www.google.com.fj/search?*',
        'https://www.google.fm/search?*',
        'https://www.google.fr/search?*',
        'https://www.google.ga/search?*',
        'https://www.google.ge/search?*',
        'https://www.google.gg/search?*',
        'https://www.google.com.gh/search?*',
        'https://www.google.com.gi/search?*',
        'https://www.google.gl/search?*',
        'https://www.google.gm/search?*',
        'https://www.google.gp/search?*',
        'https://www.google.gr/search?*',
        'https://www.google.com.gt/search?*',
        'https://www.google.gy/search?*',
        'https://www.google.com.hk/search?*',
        'https://www.google.hn/search?*',
        'https://www.google.hr/search?*',
        'https://www.google.ht/search?*',
        'https://www.google.hu/search?*',
        'https://www.google.co.id/search?*',
        'https://www.google.ie/search?*',
        'https://www.google.co.il/search?*',
        'https://www.google.im/search?*',
        'https://www.google.co.in/search?*',
        'https://www.google.iq/search?*',
        'https://www.google.is/search?*',
        'https://www.google.it/search?*',
        'https://www.google.je/search?*',
        'https://www.google.com.jm/search?*',
        'https://www.google.jo/search?*',
        'https://www.google.co.jp/search?*',
        'https://www.google.co.ke/search?*',
        'https://www.google.com.kh/search?*',
        'https://www.google.ki/search?*',
        'https://www.google.kg/search?*',
        'https://www.google.co.kr/search?*',
        'https://www.google.com.kw/search?*',
        'https://www.google.kz/search?*',
        'https://www.google.la/search?*',
        'https://www.google.com.lb/search?*',
        'https://www.google.li/search?*',
        'https://www.google.lk/search?*',
        'https://www.google.co.ls/search?*',
        'https://www.google.lt/search?*',
        'https://www.google.lu/search?*',
        'https://www.google.lv/search?*',
        'https://www.google.com.ly/search?*',
        'https://www.google.co.ma/search?*',
        'https://www.google.md/search?*',
        'https://www.google.me/search?*',
        'https://www.google.mg/search?*',
        'https://www.google.mk/search?*',
        'https://www.google.ml/search?*',
        'https://www.google.com.mm/search?*',
        'https://www.google.mn/search?*',
        'https://www.google.ms/search?*',
        'https://www.google.com.mt/search?*',
        'https://www.google.mu/search?*',
        'https://www.google.mv/search?*',
        'https://www.google.mw/search?*',
        'https://www.google.com.mx/search?*',
        'https://www.google.com.my/search?*',
        'https://www.google.co.mz/search?*',
        'https://www.google.com.na/search?*',
        'https://www.google.com.nf/search?*',
        'https://www.google.com.ng/search?*',
        'https://www.google.com.ni/search?*',
        'https://www.google.ne/search?*',
        'https://www.google.nl/search?*',
        'https://www.google.no/search?*',
        'https://www.google.com.np/search?*',
        'https://www.google.nr/search?*',
        'https://www.google.nu/search?*',
        'https://www.google.co.nz/search?*',
        'https://www.google.com.om/search?*',
        'https://www.google.com.pa/search?*',
        'https://www.google.com.pe/search?*',
        'https://www.google.com.pg/search?*',
        'https://www.google.com.ph/search?*',
        'https://www.google.com.pk/search?*',
        'https://www.google.pl/search?*',
        'https://www.google.pn/search?*',
        'https://www.google.com.pr/search?*',
        'https://www.google.ps/search?*',
        'https://www.google.pt/search?*',
        'https://www.google.com.py/search?*',
        'https://www.google.com.qa/search?*',
        'https://www.google.ro/search?*',
        'https://www.google.ru/search?*',
        'https://www.google.rw/search?*',
        'https://www.google.com.sa/search?*',
        'https://www.google.com.sb/search?*',
        'https://www.google.sc/search?*',
        'https://www.google.se/search?*',
        'https://www.google.com.sg/search?*',
        'https://www.google.sh/search?*',
        'https://www.google.si/search?*',
        'https://www.google.sk/search?*',
        'https://www.google.com.sl/search?*',
        'https://www.google.sn/search?*',
        'https://www.google.so/search?*',
        'https://www.google.sm/search?*',
        'https://www.google.sr/search?*',
        'https://www.google.st/search?*',
        'https://www.google.com.sv/search?*',
        'https://www.google.td/search?*',
        'https://www.google.tg/search?*',
        'https://www.google.co.th/search?*',
        'https://www.google.com.tj/search?*',
        'https://www.google.tk/search?*',
        'https://www.google.tl/search?*',
        'https://www.google.tm/search?*',
        'https://www.google.tn/search?*',
        'https://www.google.to/search?*',
        'https://www.google.com.tr/search?*',
        'https://www.google.tt/search?*',
        'https://www.google.com.tw/search?*',
        'https://www.google.co.tz/search?*',
        'https://www.google.com.ua/search?*',
        'https://www.google.co.ug/search?*',
        'https://www.google.co.uk/search?*',
        'https://www.google.com.uy/search?*',
        'https://www.google.co.uz/search?*',
        'https://www.google.com.vc/search?*',
        'https://www.google.co.ve/search?*',
        'https://www.google.vg/search?*',
        'https://www.google.co.vi/search?*',
        'https://www.google.com.vn/search?*',
        'https://www.google.vu/search?*',
        'https://www.google.ws/search?*',
        'https://www.google.rs/search?*',
        'https://www.google.co.za/search?*',
        'https://www.google.co.zm/search?*',
        'https://www.google.co.zw/search?*',
        'https://www.google.cat/search?*',
      ],
    },
    ['blocking']
  );

  if (!lessLanguages.includes('ru') || !moreLanguages.includes('uk')) return;

  if (process.env.NODE_ENV === 'development' || userSpeed === 'immediately') {
    browser.webRequest.onBeforeRequest.addListener(
      firefoxGoogleAutocompleteRequestListner,
      {
        urls: [
          'https://www.google.com/complete/search?*',
          'https://www.google.ad/complete/search?*',
          'https://www.google.ae/complete/search?*',
          'https://www.google.com.af/complete/search?*',
          'https://www.google.com.ag/complete/search?*',
          'https://www.google.com.ai/complete/search?*',
          'https://www.google.al/complete/search?*',
          'https://www.google.am/complete/search?*',
          'https://www.google.co.ao/complete/search?*',
          'https://www.google.com.ar/complete/search?*',
          'https://www.google.as/complete/search?*',
          'https://www.google.at/complete/search?*',
          'https://www.google.com.au/complete/search?*',
          'https://www.google.az/complete/search?*',
          'https://www.google.ba/complete/search?*',
          'https://www.google.com.bd/complete/search?*',
          'https://www.google.be/complete/search?*',
          'https://www.google.bf/complete/search?*',
          'https://www.google.bg/complete/search?*',
          'https://www.google.com.bh/complete/search?*',
          'https://www.google.bi/complete/search?*',
          'https://www.google.bj/complete/search?*',
          'https://www.google.com.bn/complete/search?*',
          'https://www.google.com.bo/complete/search?*',
          'https://www.google.com.br/complete/search?*',
          'https://www.google.bs/complete/search?*',
          'https://www.google.bt/complete/search?*',
          'https://www.google.co.bw/complete/search?*',
          'https://www.google.by/complete/search?*',
          'https://www.google.com.bz/complete/search?*',
          'https://www.google.ca/complete/search?*',
          'https://www.google.cd/complete/search?*',
          'https://www.google.cf/complete/search?*',
          'https://www.google.cg/complete/search?*',
          'https://www.google.ch/complete/search?*',
          'https://www.google.ci/complete/search?*',
          'https://www.google.co.ck/complete/search?*',
          'https://www.google.cl/complete/search?*',
          'https://www.google.cm/complete/search?*',
          'https://www.google.cn/complete/search?*',
          'https://www.google.com.co/complete/search?*',
          'https://www.google.co.cr/complete/search?*',
          'https://www.google.com.cu/complete/search?*',
          'https://www.google.cv/complete/search?*',
          'https://www.google.com.cy/complete/search?*',
          'https://www.google.cz/complete/search?*',
          'https://www.google.de/complete/search?*',
          'https://www.google.dj/complete/search?*',
          'https://www.google.dk/complete/search?*',
          'https://www.google.dm/complete/search?*',
          'https://www.google.com.do/complete/search?*',
          'https://www.google.dz/complete/search?*',
          'https://www.google.com.ec/complete/search?*',
          'https://www.google.ee/complete/search?*',
          'https://www.google.com.eg/complete/search?*',
          'https://www.google.es/complete/search?*',
          'https://www.google.com.et/complete/search?*',
          'https://www.google.fi/complete/search?*',
          'https://www.google.com.fj/complete/search?*',
          'https://www.google.fm/complete/search?*',
          'https://www.google.fr/complete/search?*',
          'https://www.google.ga/complete/search?*',
          'https://www.google.ge/complete/search?*',
          'https://www.google.gg/complete/search?*',
          'https://www.google.com.gh/complete/search?*',
          'https://www.google.com.gi/complete/search?*',
          'https://www.google.gl/complete/search?*',
          'https://www.google.gm/complete/search?*',
          'https://www.google.gp/complete/search?*',
          'https://www.google.gr/complete/search?*',
          'https://www.google.com.gt/complete/search?*',
          'https://www.google.gy/complete/search?*',
          'https://www.google.com.hk/complete/search?*',
          'https://www.google.hn/complete/search?*',
          'https://www.google.hr/complete/search?*',
          'https://www.google.ht/complete/search?*',
          'https://www.google.hu/complete/search?*',
          'https://www.google.co.id/complete/search?*',
          'https://www.google.ie/complete/search?*',
          'https://www.google.co.il/complete/search?*',
          'https://www.google.im/complete/search?*',
          'https://www.google.co.in/complete/search?*',
          'https://www.google.iq/complete/search?*',
          'https://www.google.is/complete/search?*',
          'https://www.google.it/complete/search?*',
          'https://www.google.je/complete/search?*',
          'https://www.google.com.jm/complete/search?*',
          'https://www.google.jo/complete/search?*',
          'https://www.google.co.jp/complete/search?*',
          'https://www.google.co.ke/complete/search?*',
          'https://www.google.com.kh/complete/search?*',
          'https://www.google.ki/complete/search?*',
          'https://www.google.kg/complete/search?*',
          'https://www.google.co.kr/complete/search?*',
          'https://www.google.com.kw/complete/search?*',
          'https://www.google.kz/complete/search?*',
          'https://www.google.la/complete/search?*',
          'https://www.google.com.lb/complete/search?*',
          'https://www.google.li/complete/search?*',
          'https://www.google.lk/complete/search?*',
          'https://www.google.co.ls/complete/search?*',
          'https://www.google.lt/complete/search?*',
          'https://www.google.lu/complete/search?*',
          'https://www.google.lv/complete/search?*',
          'https://www.google.com.ly/complete/search?*',
          'https://www.google.co.ma/complete/search?*',
          'https://www.google.md/complete/search?*',
          'https://www.google.me/complete/search?*',
          'https://www.google.mg/complete/search?*',
          'https://www.google.mk/complete/search?*',
          'https://www.google.ml/complete/search?*',
          'https://www.google.com.mm/complete/search?*',
          'https://www.google.mn/complete/search?*',
          'https://www.google.ms/complete/search?*',
          'https://www.google.com.mt/complete/search?*',
          'https://www.google.mu/complete/search?*',
          'https://www.google.mv/complete/search?*',
          'https://www.google.mw/complete/search?*',
          'https://www.google.com.mx/complete/search?*',
          'https://www.google.com.my/complete/search?*',
          'https://www.google.co.mz/complete/search?*',
          'https://www.google.com.na/complete/search?*',
          'https://www.google.com.nf/complete/search?*',
          'https://www.google.com.ng/complete/search?*',
          'https://www.google.com.ni/complete/search?*',
          'https://www.google.ne/complete/search?*',
          'https://www.google.nl/complete/search?*',
          'https://www.google.no/complete/search?*',
          'https://www.google.com.np/complete/search?*',
          'https://www.google.nr/complete/search?*',
          'https://www.google.nu/complete/search?*',
          'https://www.google.co.nz/complete/search?*',
          'https://www.google.com.om/complete/search?*',
          'https://www.google.com.pa/complete/search?*',
          'https://www.google.com.pe/complete/search?*',
          'https://www.google.com.pg/complete/search?*',
          'https://www.google.com.ph/complete/search?*',
          'https://www.google.com.pk/complete/search?*',
          'https://www.google.pl/complete/search?*',
          'https://www.google.pn/complete/search?*',
          'https://www.google.com.pr/complete/search?*',
          'https://www.google.ps/complete/search?*',
          'https://www.google.pt/complete/search?*',
          'https://www.google.com.py/complete/search?*',
          'https://www.google.com.qa/complete/search?*',
          'https://www.google.ro/complete/search?*',
          'https://www.google.ru/complete/search?*',
          'https://www.google.rw/complete/search?*',
          'https://www.google.com.sa/complete/search?*',
          'https://www.google.com.sb/complete/search?*',
          'https://www.google.sc/complete/search?*',
          'https://www.google.se/complete/search?*',
          'https://www.google.com.sg/complete/search?*',
          'https://www.google.sh/complete/search?*',
          'https://www.google.si/complete/search?*',
          'https://www.google.sk/complete/search?*',
          'https://www.google.com.sl/complete/search?*',
          'https://www.google.sn/complete/search?*',
          'https://www.google.so/complete/search?*',
          'https://www.google.sm/complete/search?*',
          'https://www.google.sr/complete/search?*',
          'https://www.google.st/complete/search?*',
          'https://www.google.com.sv/complete/search?*',
          'https://www.google.td/complete/search?*',
          'https://www.google.tg/complete/search?*',
          'https://www.google.co.th/complete/search?*',
          'https://www.google.com.tj/complete/search?*',
          'https://www.google.tk/complete/search?*',
          'https://www.google.tl/complete/search?*',
          'https://www.google.tm/complete/search?*',
          'https://www.google.tn/complete/search?*',
          'https://www.google.to/complete/search?*',
          'https://www.google.com.tr/complete/search?*',
          'https://www.google.tt/complete/search?*',
          'https://www.google.com.tw/complete/search?*',
          'https://www.google.co.tz/complete/search?*',
          'https://www.google.com.ua/complete/search?*',
          'https://www.google.co.ug/complete/search?*',
          'https://www.google.co.uk/complete/search?*',
          'https://www.google.com.uy/complete/search?*',
          'https://www.google.co.uz/complete/search?*',
          'https://www.google.com.vc/complete/search?*',
          'https://www.google.co.ve/complete/search?*',
          'https://www.google.vg/complete/search?*',
          'https://www.google.co.vi/complete/search?*',
          'https://www.google.com.vn/complete/search?*',
          'https://www.google.vu/complete/search?*',
          'https://www.google.ws/complete/search?*',
          'https://www.google.rs/complete/search?*',
          'https://www.google.co.za/complete/search?*',
          'https://www.google.co.zm/complete/search?*',
          'https://www.google.co.zw/complete/search?*',
          'https://www.google.cat/complete/search?*',
        ],
      },
      ['blocking']
    );
  }
}
/// #endif

/// #if PLATFORM == 'CHROME' || PLATFORM == 'SAFARI'
async function chromeSetupDynamicRewriteRules(userSettings) {
  console.log('Setting up chrome-alike dynamic rewrite rules');
  const filterValue =
    '(-' + lessLanguages.map((lang) => `lang_${lang})`).join('.');

  const rulesOk = await browser.declarativeNetRequest
    .updateDynamicRules({
      addRules: [
        {
          id: 1,
          priority: 1,
          action: {
            type: 'redirect',
            redirect: {
              transform: {
                queryTransform: {
                  addOrReplaceParams: [{ key: 'lr', value: filterValue }],
                },
              },
            },
          },
          condition: {
            regexFilter:
              '^https://(?:www\\.)?google\\.(\\w\\w|co\\.(\\w\\w)|com|com\\.(\\w\\w)|\\w\\w)/search?.*',
            resourceTypes: ['main_frame'],
          },
        },
      ],
      removeRuleIds: [1],
    })
    .catch((e) => {
      reportError('Failed to set up chrome rewrite rules', e);
    });

  console.log('declarative rules', rulesOk);

  if (!lessLanguages.includes('ru') || !moreLanguages.includes('uk')) return;

  if (process.env.NODE_ENV === 'development' || userSpeed === 'immediately') {
    browser.declarativeNetRequest.updateDynamicRules({
      addRules: [
        {
          id: 2,
          priority: 2,
          action: {
            type: 'redirect',
            redirect: {
              transform: { host: 'gs.hmara.info' },
            },
          },
          condition: {
            regexFilter:
              '^https://www\\.google\\.(?:\\w\\w|co\\.(?:\\w\\w)|com|com\\.(?:\\w\\w)|\\w\\w)/complete/search?.*',
            resourceTypes: ['xmlhttprequest', 'other'],
          },
        },
      ],
      removeRuleIds: [2],
    });
  }
}
/// #endif
