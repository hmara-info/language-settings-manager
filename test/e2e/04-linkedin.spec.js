require('./lu-puppeteer.js');

const linkedInTestUrl = 'https://www.linkedin.com/feed/';

describe('LinkedIn handler', () => {
  beforeAll(async () => {
    try {
      await worker.evaluate(async () => {
        await chrome.storage.sync.set({
          userSettings: {
            moreLanguages: ['uk'],
            lessLanguages: ['ru'],
          },
        });
      });
    } catch (e) {
      console.error('Error setting storage in worker:', e);
    }
  });

  it('does not prompt the user when not logged in', async () => {
    await page.goto(linkedInTestUrl, {
      waitUntil: 'networkidle0',
    });

    const shadowHostPresent = await page.evaluate(async () => {
      const shadowHost = document.querySelector('#lu-shadow-host');
      return shadowHost ? true : false;
    });

    expect(shadowHostPresent).toBe(false);
  });

  it('prompts the user to go to a page in a desired language', async () => {
    await page.goto('https://www.linkedin.com/login', {
      waitUntil: 'networkidle0',
    });

    await page.type('#username', process.env.LINKEDIN_USER);
    await page.type('#password', process.env.LINKEDIN_PASSWORD);
    await page.click('.btn__primary--large');
    await page.waitForNavigation({ waitUntil: 'networkidle0' });

    await page.goto(linkedInTestUrl, {
      waitUntil: 'networkidle0',
    });

    const shadowHostPresent = await page.evaluate(async () => {
      const shadowHost = document.querySelector('#lu-shadow-host');
      if (!shadowHost) {
        return false;
      }
      return true;
      // const promptDiv = shadowHost.querySelector('lahidnaUkrainizatsiya');
      // return promptDiv ? true : false;
    });

    expect(shadowHostPresent).toBe(true);
  });
});
