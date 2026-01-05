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
}, 150000);
