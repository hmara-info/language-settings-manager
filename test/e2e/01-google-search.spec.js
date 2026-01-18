require('./lu-puppeteer.js');

describe('Google Search Results handler', () => {
  const testSetup = async (opts) => {
    const lessLanguages = opts.lessLanguages;
    await worker.evaluate(async (lessLanguages) => {
      await chrome.storage.sync.set({
        userSettings: {
          lessLanguages: [...lessLanguages],
          moreLanguages: ['uk'],
        },
      });
    }, lessLanguages);
    await page.setExtraHTTPHeaders({
      'Accept-Language': opts.acceptLanguage, // ,
    });

    await page.goto('https://www.google.com/search?q=test', {
      waitUntil: 'networkidle2',
    });
    var url = await page.evaluate(() => document.location.href);
    var lr = new URL(url).searchParams.get('lr');
    expect(lr).toBe(opts.expectedLr);
  };

  it('google-rewrite adds no lr parameter when lessLanguages is empty', async () => {
    await testSetup({
      lessLanguages: [],
      acceptLanguage: 'uk-UA,uk',
      expectedLr: '',
    });
  }, 50000);

  it('google-rewrite adds correct lr parameter to the url', async () => {
    await testSetup({
      lessLanguages: ['ru'],
      acceptLanguage: 'uk-UA,uk',
      expectedLr: '(-lang_ru)',
    });

    await testSetup({
      lessLanguages: ['en'],
      acceptLanguage: 'uk-UA,uk',
      expectedLr: '(-lang_en)',
    });
  }, 50000);

  describe('moreLanguages includes current UI language', () => {
    const checkShadowHostPresence = async () => {
      return await page.evaluate(() => {
        const shadowHost = document.querySelector('#lu-shadow-host');
        return shadowHost !== null;
      });
    };

    const changeGoogleLanguageTo = async (targetLang) => {
      // Get signature from preferences page and change language directly
      await page.evaluate(async (lang) => {
        const response = await fetch('/preferences?lang=1', {
          credentials: 'same-origin',
        });
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        const url = doc.querySelector('div[jscontroller="gri7yb"]').dataset
          .spbu;
        const sigSearchParams = new URLSearchParams(url.split('?')[1]);
        const sig = sigSearchParams.get('sig');

        const setprefsUrl = new URL('/setprefs', location.origin);
        setprefsUrl.searchParams.append('sig', sig);
        setprefsUrl.searchParams.append('hl', lang);
        setprefsUrl.searchParams.append('lang', lang);

        await fetch(setprefsUrl, { credentials: 'same-origin' });
      }, targetLang);
    };

    it('first switch Google to English directly', async () => {
      await page.goto('https://www.google.com/search?q=test', {
        waitUntil: 'networkidle2',
      });

      // Change Google to English directly using setprefs
      await changeGoogleLanguageTo('en');

      // Reload and verify
      await page.goto('https://www.google.com/search?q=test', {
        waitUntil: 'networkidle2',
      });

      const googleLang = await page.evaluate(async () => {
        const response = await fetch('/preferences?lang=1', {
          credentials: 'same-origin',
        });
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        return doc.documentElement.lang.replace(/-.*/, '').toLowerCase();
      });
      console.log(`Google is now set to: ${googleLang}`);
      expect(googleLang).toBe('en');
    }, 60000);

    it('shows popup when moreLanguages is [uk] and Google is in English', async () => {
      // Set moreLanguages to only Ukrainian
      await worker.evaluate(async () => {
        await chrome.storage.sync.set({
          userSettings: {
            moreLanguages: ['uk'],
            lessLanguages: [],
            speed: 'fast',
          },
        });
        await chrome.storage.local.remove([
          'handler.google-search',
          'lastPromptTs',
        ]);
      });

      await page.goto('https://www.google.com/search?q=test', {
        waitUntil: 'networkidle2',
      });

      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Popup SHOULD appear because Google is in English but moreLanguages only has Ukrainian
      expect(await checkShadowHostPresence()).toBe(true);
    }, 30000);

    it('does not show popup when moreLanguages is [uk, en] and Google is in English', async () => {
      // Set moreLanguages to Ukrainian AND English
      await worker.evaluate(async () => {
        await chrome.storage.sync.set({
          userSettings: {
            moreLanguages: ['uk', 'en'],
            lessLanguages: ['ru'],
            speed: 'fast',
          },
        });
        await chrome.storage.local.remove([
          'handler.google-search',
          'lastPromptTs',
        ]);
      });

      await page.goto('https://www.google.com/search?q=test', {
        waitUntil: 'networkidle2',
      });

      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Popup should NOT appear because English is in moreLanguages and Google is already in English
      expect(await checkShadowHostPresence()).toBe(false);
    }, 30000);
  });

  describe('prompt backoff mechanism', () => {
    const checkShadowHostPresence = async () => {
      return await page.evaluate(() => {
        const shadowHost = document.querySelector('#lu-shadow-host');
        return shadowHost !== null;
      });
    };

    it('shows prompt when backoff period has expired', async () => {
      // Set up user settings with fast speed (1 minute backoff)
      await worker.evaluate(async () => {
        await chrome.storage.sync.set({
          userSettings: {
            moreLanguages: ['uk'],
            lessLanguages: [],
            speed: 'fast',
          },
        });
        // Set lastPromptTs to 2 minutes ago (past the 1 minute backoff)
        await chrome.storage.local.set({
          lastPromptTs: Date.now() - 2 * 60 * 1000,
        });
      });

      await page.goto('https://www.google.com/search?q=test', {
        waitUntil: 'networkidle2',
      });

      // Wait for prompt to appear
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Prompt SHOULD appear since backoff expired
      expect(await checkShadowHostPresence()).toBe(true);
    }, 30000);

    it('does not show prompt when within backoff period', async () => {
      // Set up user settings with gentle speed (1 hour backoff)
      await worker.evaluate(async () => {
        await chrome.storage.sync.set({
          userSettings: {
            moreLanguages: ['uk'],
            lessLanguages: [],
            speed: 'gentle',
          },
        });
        // Set lastPromptTs to 30 minutes ago (within 1 hour backoff)
        await chrome.storage.local.set({
          lastPromptTs: Date.now() - 30 * 60 * 1000,
        });
      });

      await page.goto('https://www.google.com/search?q=test', {
        waitUntil: 'networkidle2',
      });

      // Wait for potential prompt
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Prompt should NOT appear due to backoff
      expect(await checkShadowHostPresence()).toBe(false);
    }, 30000);
  });
}, 150000);
