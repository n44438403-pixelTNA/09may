import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:4173');

  await page.waitForSelector('text="Create Account"');
  await page.click('text="Create Account"');
  await page.waitForSelector('input[name="email"]');
  await page.screenshot({ path: 'create_account.png' });

  await page.click('text="Go Back"');
  await page.click('text="Log in"');
  await page.waitForSelector('input[name="email"]');
  await page.screenshot({ path: 'log_in.png' });

  await browser.close();
})();
