import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 900 });

const path = new URL('./marketing/index.html', import.meta.url).pathname;
await page.goto(`file://${path}`);
await page.waitForTimeout(500); // let fonts load

await page.screenshot({ path: 'sc_marketing_hero.png' });

// Scroll to problem section
await page.evaluate(() => document.getElementById('problem').scrollIntoView());
await page.waitForTimeout(400);
await page.screenshot({ path: 'sc_marketing_problem.png' });

// Scroll to features
await page.evaluate(() => document.getElementById('product').scrollIntoView());
await page.waitForTimeout(400);
await page.screenshot({ path: 'sc_marketing_features.png' });

// Scroll to CTA
await page.evaluate(() => document.getElementById('get-access').scrollIntoView());
await page.waitForTimeout(400);
await page.screenshot({ path: 'sc_marketing_cta.png' });

// Test email submit
await page.fill('#email-input', 'test@example.com');
await page.click('#submit-btn');
await page.waitForTimeout(800);
await page.screenshot({ path: 'sc_marketing_success.png' });

// Mobile view
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(`file://${path}`);
await page.waitForTimeout(400);
await page.screenshot({ path: 'sc_marketing_mobile.png' });

await browser.close();
console.log('done');
