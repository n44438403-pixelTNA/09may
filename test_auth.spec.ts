import { test, expect } from '@playwright/test';

test('auth options', async ({ page }) => {
  await page.goto('http://localhost:4173');

  await page.waitForSelector('text="Create Account"');
  await page.waitForSelector('text="Log in"');

  await page.click('text="Create Account"');

  await page.waitForSelector('input[name="email"]');
  await page.waitForSelector('input[name="password"]');
  await page.waitForSelector('button:has-text("Create Account")');
  await page.waitForSelector('button:has-text("Google")');

  await page.click('text="Go Back"');

  await page.click('text="Log in"');
  await page.waitForSelector('input[name="email"]');
  await page.waitForSelector('input[name="password"]');
  await page.waitForSelector('button:has-text("Log In")');
  await page.waitForSelector('button:has-text("Google")');

  console.log("Success");
});
