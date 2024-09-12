const puppeteer = require('puppeteer');

const CRX_PATH = './build';
const opts = {
  headless: false,
  slowMo: 100,
  timeout: 10000,
  defaultViewport: null,
  args: [
    '--start-maximized',
    '--window-size=1920,1040',
    `--disable-extensions-except=${CRX_PATH}`,
    `--load-extension=${CRX_PATH}`,
    '--user-agent=PuppeteerAgent',
  ],
};

beforeAll(async () => {
  global.browser = await puppeteer.launch(opts);
  global.page = await global.browser.newPage();

  await global.page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0'
  );

  const workerTarget = await global.browser.waitForTarget(
    (target) =>
      target.type() === 'service_worker' &&
      target.url().endsWith('background.bundle.js')
  );
  global.worker = await workerTarget.worker();
});

afterAll(async () => {
  try {
    await page.close();
  } catch (e) {}
  await browser.close();
});
