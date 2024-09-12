require('./lu-puppeteer.js');

describe('Wikipedia handler', () => {
  beforeAll(async () => {
    try {
      await worker.evaluate(async () => {
        await chrome.storage.sync.set({
          userSettings: {
            moreLanguages: ['uk'],
          },
        });
      });
    } catch (e) {
      console.error('Error setting storage in worker:', e);
    }
  });

  it('does not prompt the user when the page is in a desired language', async () => {
    await page.goto('https://uk.wikipedia.org/wiki/Головна_сторінка', {
      waitUntil: 'networkidle0',
    });

    const shadowHostPresent = await page.evaluate(async () => {
      const shadowHost = document.querySelector('#lu-shadow-host');
      if (!shadowHost) {
        return false;
      }
    });

    expect(shadowHostPresent).toBe(false);
  });

  it('prompts the user to go to a page in a desired language', async () => {
    await page.goto('https://en.wikipedia.org/wiki/Main_Page', {
      waitUntil: 'networkidle0',
    });

    const shadowHostPresent = await page.evaluate(async () => {
      const shadowHost = document.querySelector('#lu-shadow-host');
      if (!shadowHost) {
        return false;
      }
      return true;
      const promptDiv = shadowHost.querySelector('lahidnaUkrainizatsiya');
      return promptDiv ? true : false;
    });

    expect(shadowHostPresent).toBe(true);
  });
});
