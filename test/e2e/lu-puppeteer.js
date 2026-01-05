const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const CRX_PATH = './build';
const SESSION_FILE = path.join(__dirname, 'google-session.json');

const opts = {
  headless: false,
  slowMo: 100,
  timeout: 100000,
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
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36'
  );

  // Load saved session if exists
  if (fs.existsSync(SESSION_FILE)) {
    const sessionData = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
    console.log(
      `📂 Loading saved session (${sessionData.cookies.length} cookies)`
    );

    // Set cookies - need to navigate first for cookies to work
    await global.page.goto('https://www.google.com');
    await global.page.setCookie(...sessionData.cookies);
  }

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
