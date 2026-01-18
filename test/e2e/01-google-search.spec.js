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
