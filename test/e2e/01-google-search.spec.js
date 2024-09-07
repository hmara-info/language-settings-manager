const puppeteer = require('puppeteer');
require('./lu-puppeteer.js');

describe('Google Search Results', () => {
  beforeAll(async () => {
    try {
      await worker.evaluate(async () => {
        await chrome.storage.sync.set({
          userSettings: {
            lessLanguages: ['ru'],
            moreLanguages: ['uk'],
          },
        });
      });
    } catch (e) {
      console.error('Error setting storage in worker:', e);
    }
  });

  it('google-rewrite adds correct lr parameter to the url', async () => {
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'ru-RU,ru',
    });
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0'
    );

    await page.goto('https://www.google.com/search?q=test', {
      waitUntil: 'networkidle0',
    });
    var url = await page.evaluate(() => document.location.href);
    var lr = new URL(url).searchParams.get('lr');
    expect(lr).toBe('(-lang_ru)');

    await worker.evaluate(async () => {
      await chrome.storage.sync.set({
        userSettings: {
          collectStats: true,
          is_18: true,
          lessLanguages: ['en'],
          moreLanguages: ['uk'],
        },
      });
    });
    await page.goto('https://www.google.com/search?q=test', {
      waitUntil: 'networkidle0',
    });
    var url = await page.evaluate(() => document.location.href);
    var lr = new URL(url).searchParams.get('lr');
    expect(lr).toBe('(-lang_en)');
  });
});
