const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const CRX_PATH = './build';
const SESSION_FILE = path.join(__dirname, 'google-session.json');

const opts = {
  headless: false,
  slowMo: 100,
  args: [
    '--start-maximized',
    '--window-size=1920,1040',
    `--disable-extensions-except=${CRX_PATH}`,
    `--load-extension=${CRX_PATH}`,
  ],
};

async function setupSession() {
  console.log('🚀 Launching browser for session setup...');
  const browser = await puppeteer.launch(opts);
  const page = await browser.newPage();

  await page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36'
  );
  var sessionData;
  if (fs.existsSync(SESSION_FILE)) {
    sessionData = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
  }

  console.log('📍 Navigating to Google...');
  if (sessionData) {
    // Filter cookies to only include fields that setCookie accepts
    const cookiesToSet = sessionData.cookies.map((cookie) => ({
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path,
      expires: cookie.expires,
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
      sameSite: cookie.sameSite,
    }));
    await page.setCookie(...cookiesToSet);
  }
  await page.goto('https://www.google.com/search?q=test', {
    waitUntil: 'networkidle0',
  });

  console.log('\n⏸️  MANUAL INTERVENTION REQUIRED');
  console.log('=================================');
  console.log(
    '👉 Please complete any CAPTCHA or verification in the browser window'
  );
  console.log('👉 You can navigate to multiple sites (Google, LinkedIn, etc.)');
  console.log('👉 Log in to all the sites you need');
  console.log('👉 Press ENTER in this terminal when done...\n');

  // Wait for user to press Enter
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  await new Promise((resolve) => {
    rl.question('', () => {
      rl.close();
      resolve();
    });
  });

  console.log('\n💾 Saving session...');

  // Save cookies from ALL domains (not just current page)
  const client = await page.target().createCDPSession();
  const { cookies } = await client.send('Network.getAllCookies');

  // Save localStorage (if needed)
  const localStorage = await page.evaluate(() => {
    return JSON.stringify(window.localStorage);
  });

  sessionData = {
    cookies,
    localStorage,
    savedAt: new Date().toISOString(),
  };

  fs.writeFileSync(SESSION_FILE, JSON.stringify(sessionData, null, 2));

  console.log(`✅ Session saved to: ${SESSION_FILE}`);
  console.log(`📊 Saved ${cookies.length} cookies`);
  console.log('\n🎉 Setup complete! You can now run your tests.');

  await browser.close();
}

setupSession().catch((error) => {
  console.error('❌ Error during setup:', error);
  process.exit(1);
});
