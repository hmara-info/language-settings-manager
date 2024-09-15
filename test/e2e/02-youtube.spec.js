require('./lu-puppeteer.js');

describe('YouTube Content Handler', () => {
  const testSetup = async (opts) => {
    await worker.evaluate(async (moreLanguages) => {
      await chrome.storage.sync.set({
        userSettings: {
          lessLanguages: ['uk'],
          moreLanguages: [...moreLanguages],
        },
      });
    }, opts.moreLanguages);
    await page.setExtraHTTPHeaders({
      'Accept-Language': opts.acceptLanguage,
    });

    await page.goto('https://www.youtube.com/', {
      waitUntil: 'networkidle0',
    });
    const promptDivPresent = await page.evaluate(async () => {
      const shadowHost = document.querySelector('#lu-shadow-host');
      if (!shadowHost) {
        return false;
      }
      const shadowRoot = shadowHost.shadowRoot;
      const promptDiv = shadowRoot.querySelector('.lahidnaUkrainizatsiya');
      return promptDiv ? true : false;
    });
    return promptDivPresent;
  };

  it('does not prompt the user to change UI language when UI is Ukrainian', async () => {
    const promptVisible = await testSetup({
      moreLanguages: ['uk'],
      acceptLanguage: 'uk-UA,uk',
    });
    expect(promptVisible).toBe(false);
  }, 10000);

  it('prompts the user to change UI language to Ukrainian', async () => {
    const promptVisible = await testSetup({
      moreLanguages: ['uk'],
      acceptLanguage: 'en-GB,en',
    });
    expect(promptVisible).toBe(true);
  }, 10000);

});
