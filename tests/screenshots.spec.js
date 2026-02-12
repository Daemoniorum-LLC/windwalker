/**
 * Screenshot generator for Windwalker
 *
 * Captures key views of the application for sharing/documentation.
 * Run with: npx playwright test scripts/screenshots.js
 */

const { test } = require('@playwright/test');
const path = require('path');

const SCREENSHOT_DIR = path.join(__dirname, '..', 'docs', 'screenshots');

test.describe('Windwalker Screenshots', () => {

  test.beforeEach(async ({ page }) => {
    // Set consistent viewport for screenshots
    await page.setViewportSize({ width: 1400, height: 900 });
  });

  test('01 - Homepage with map and treaty boundaries', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    // Wait for map and boundaries to load
    await page.waitForSelector('#windwalker-map');
    await page.waitForTimeout(4000);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/01-homepage-map.png`,
      fullPage: false
    });
  });

  test('02 - Treaty list in sidebar', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForSelector('.treaty-item', { timeout: 15000 });
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/02-treaty-sidebar.png`,
      fullPage: false
    });
  });

  test('03 - Treaty detail panel', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForSelector('.treaty-item', { timeout: 15000 });

    // Click first treaty to open detail panel
    await page.locator('.treaty-item').first().click();
    await page.waitForSelector('.detail-panel:visible');
    await page.waitForTimeout(500);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/03-treaty-detail.png`,
      fullPage: false
    });
  });

  test('04 - Timeline at 1800 (early treaties)', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForSelector('.treaty-item', { timeout: 15000 });
    await page.waitForTimeout(3000); // Wait for boundaries

    // Move slider to 1800
    const slider = page.locator('#year-slider');
    await slider.fill('1800');
    await slider.dispatchEvent('input');
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/04-timeline-1800.png`,
      fullPage: false
    });
  });

  test('05 - Timeline at 1850 (mid treaties)', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForSelector('.treaty-item', { timeout: 15000 });
    await page.waitForTimeout(3000);

    const slider = page.locator('#year-slider');
    await slider.fill('1850');
    await slider.dispatchEvent('input');
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/05-timeline-1850.png`,
      fullPage: false
    });
  });

  test('06 - Status filter (Active treaties)', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForSelector('.treaty-item', { timeout: 15000 });

    // Filter by Active status
    await page.locator('.filter-select').selectOption('Active');
    await page.waitForTimeout(500);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/06-filter-active.png`,
      fullPage: false
    });
  });

  test('07 - Search results', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForSelector('.treaty-item', { timeout: 15000 });

    // Search for Cherokee
    await page.locator('#search-input').fill('Cherokee');
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/07-search-cherokee.png`,
      fullPage: false
    });
  });

  test('08 - Treaties page', async ({ page }) => {
    await page.goto('/treaties', { waitUntil: 'networkidle' });
    await page.waitForSelector('.treaty-grid');
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/08-treaties-page.png`,
      fullPage: false
    });
  });

  test('09 - Tribal Nations page', async ({ page }) => {
    await page.goto('/tribes', { waitUntil: 'networkidle' });
    await page.waitForSelector('.tribe-grid');
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/09-tribes-page.png`,
      fullPage: false
    });
  });

  test('10 - About page', async ({ page }) => {
    await page.goto('/about', { waitUntil: 'networkidle' });
    await page.waitForSelector('.about-page');
    await page.waitForTimeout(500);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/10-about-page.png`,
      fullPage: false
    });
  });

});
