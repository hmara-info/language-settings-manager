require('./lu-puppeteer.js');

describe('Wikipedia handler', () => {
  const setSpeed = async (speed) => {
    try {
      await worker.evaluate(async (speedValue) => {
        await chrome.storage.sync.set({
          userSettings: {
            moreLanguages: ['uk'],
            lessLanguages: ['ru'],
            speed: speedValue,
          },
        });
      }, speed);
    } catch (e) {
      console.error('Error setting storage in worker:', e);
    }
  };

  const checkShadowHostPresence = async () => {
    return await page.evaluate(() => {
      const shadowHost = document.querySelector('#lu-shadow-host');
      return shadowHost !== null;
    });
  };

  const testCases = [
    {
      description:
        'does not prompt the user when the page is in a desired language',
      url: 'https://uk.wikipedia.org/wiki/Головна_сторінка',
      expectPrompt: false,
    },
    {
      description:
        'from undesired language page, prompts the user to go to a page in a desired language',
      url: 'https://ru.wikipedia.org/wiki/Тест',
      expectPrompt: true,
    },
    {
      description: 'from neutral language page',
      url: 'https://en.wikipedia.org/wiki/Main_Page',
      expectPrompt: (speed) => speed === 'fast',
    },
  ];

  describe.each(['fast', 'gentle'])('with %s speed', (speed) => {
    beforeAll(async () => {
      await setSpeed(speed);
    });

    testCases.forEach((testCase) => {
      it(testCase.description, async () => {
        await page.goto(testCase.url, { waitUntil: 'networkidle0' });
        const shadowHostPresent = await checkShadowHostPresence();
        const expectedPrompt =
          typeof testCase.expectPrompt === 'function'
            ? testCase.expectPrompt(speed)
            : testCase.expectPrompt;
        expect(shadowHostPresent).toBe(expectedPrompt);
      });
    });
  });
});
