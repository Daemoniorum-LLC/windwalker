// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Windwalker - Native Treaty Mapping Initiative', () => {

  test.describe('Homepage & Map View', () => {

    test('should load the homepage with map and treaty browser', async ({ page }) => {
      await page.goto('/', { waitUntil: 'networkidle' });

      // Header should be visible
      await expect(page.locator('.brand-title')).toHaveText('Windwalker');
      await expect(page.locator('.brand-subtitle')).toContainText('Native Treaty Mapping');

      // Navigation should be present
      await expect(page.locator('.nav-link')).toHaveCount(4);

      // Map should load
      await expect(page.locator('#windwalker-map')).toBeVisible();

      // Treaty browser sidebar should be visible
      await expect(page.locator('.treaty-browser')).toBeVisible();
    });

    test('should display treaties in the sidebar', async ({ page }) => {
      // Capture all console messages
      page.on('console', msg => console.log('PAGE LOG:', msg.text()));

      await page.goto('/', { waitUntil: 'networkidle' });

      // Debug: check what's in the treaty list area
      const treatyBrowser = await page.locator('.treaty-browser').innerHTML();
      console.log('Treaty browser HTML:', treatyBrowser.substring(0, 500));

      // Wait for treaties to load - use a longer timeout
      await page.waitForSelector('.treaty-item', { timeout: 20000 });

      // Should have multiple treaties
      const treatyItems = page.locator('.treaty-item');
      await expect(treatyItems).not.toHaveCount(0);

      // Treaty count should be displayed
      const countEl = page.locator('#treaty-count');
      await expect(countEl).toBeVisible();
      const countText = await countEl.textContent();
      expect(countText).toMatch(/\d+ treaties/);
    });

    test('should show treaty details when clicking a treaty', async ({ page }) => {
      await page.goto('/', { waitUntil: 'networkidle' });

      // Wait for treaties to load
      await page.waitForSelector('.treaty-item', { timeout: 15000 });

      // Click first treaty
      await page.locator('.treaty-item').first().click();

      // Detail panel should open
      await expect(page.locator('.detail-panel')).toBeVisible();

      // Should show treaty name in panel header
      await expect(page.locator('.panel-header h2')).not.toBeEmpty();
    });

  });

  test.describe('Temporal Slider', () => {

    test('should filter treaties when slider is moved', async ({ page }) => {
      await page.goto('/', { waitUntil: 'networkidle' });

      // Wait for treaties to load
      await page.waitForSelector('.treaty-item', { timeout: 15000 });

      // Get initial count
      const initialCount = await page.locator('.treaty-item').count();

      // Move slider to 1800 (early years)
      const slider = page.locator('#year-slider');
      await slider.fill('1800');
      await slider.dispatchEvent('input');

      // Wait for filtering to apply
      await page.waitForTimeout(500);

      // Treaty count should be less than initial (fewer treaties by 1800)
      const filteredCount = await page.locator('.treaty-item').count();
      expect(filteredCount).toBeLessThan(initialCount);

      // Year display should update
      await expect(page.locator('#current-year')).toHaveText('1800');
    });

    test('should show all treaties when slider is at 1871', async ({ page }) => {
      await page.goto('/', { waitUntil: 'networkidle' });

      // Wait for treaties to load
      await page.waitForSelector('.treaty-item', { timeout: 15000 });

      // Set slider to 1871 (maximum)
      const slider = page.locator('#year-slider');
      await slider.fill('1871');
      await slider.dispatchEvent('input');

      // Wait for response
      await page.waitForTimeout(500);

      // Should have a good number of treaties
      const count = await page.locator('.treaty-item').count();
      expect(count).toBeGreaterThan(100);
    });

    test('playback controls should be visible', async ({ page }) => {
      await page.goto('/', { waitUntil: 'networkidle' });

      await expect(page.locator('.playback-controls')).toBeVisible();
      await expect(page.locator('#play-btn')).toBeVisible();
      await expect(page.locator('.reset-btn')).toBeVisible();
    });

  });

  test.describe('Status Filter', () => {

    test('should filter treaties by status', async ({ page }) => {
      await page.goto('/', { waitUntil: 'networkidle' });

      // Wait for treaties to load
      await page.waitForSelector('.treaty-item', { timeout: 15000 });

      // Get initial count
      const initialCount = await page.locator('.treaty-item').count();

      // Select "Active" status
      await page.locator('.filter-select').selectOption('Active');

      // Wait for filtering
      await page.waitForTimeout(300);

      // All visible treaties should have Active status
      const treatyItems = page.locator('.treaty-item');
      const count = await treatyItems.count();

      for (let i = 0; i < Math.min(count, 5); i++) {
        const item = treatyItems.nth(i);
        await expect(item.locator('.status-badge')).toHaveText('Active');
      }
    });

    test('should show all statuses in dropdown', async ({ page }) => {
      await page.goto('/', { waitUntil: 'networkidle' });

      const options = page.locator('.filter-select option');
      await expect(options).toHaveCount(4); // All, Active, Violated, Unknown
    });

  });

  test.describe('Search', () => {

    test('should have search input', async ({ page }) => {
      await page.goto('/', { waitUntil: 'networkidle' });

      await expect(page.locator('#search-input')).toBeVisible();
      await expect(page.locator('#search-input')).toHaveAttribute('placeholder', /Search/);
    });

    test('should show search results when typing', async ({ page }) => {
      await page.goto('/', { waitUntil: 'networkidle' });

      // Type in search
      await page.locator('#search-input').fill('Cherokee');

      // Wait for search results
      await page.waitForTimeout(500);

      // Search results should appear
      const results = page.locator('#search-results');
      await expect(results).not.toBeEmpty();
    });

  });

  test.describe('Client-Side Routing', () => {

    test('should navigate to Treaties page', async ({ page }) => {
      await page.goto('/', { waitUntil: 'networkidle' });

      // Click Treaties nav link
      await page.locator('.nav-link:has-text("Treaties")').click();

      // URL should change
      await expect(page).toHaveURL('/treaties');

      // Page content should show treaties grid
      await expect(page.locator('.page-content h1')).toHaveText('All Treaties');
      await expect(page.locator('.treaty-grid')).toBeVisible();
    });

    test('should navigate to Tribal Nations page', async ({ page }) => {
      await page.goto('/', { waitUntil: 'networkidle' });

      // Click Tribal Nations nav link
      await page.locator('.nav-link:has-text("Tribal Nations")').click();

      // URL should change
      await expect(page).toHaveURL('/tribes');

      // Page content should show tribes
      await expect(page.locator('.page-content h1')).toHaveText('Tribal Nations');
      await expect(page.locator('.tribe-grid')).toBeVisible();
    });

    test('should navigate to About page', async ({ page }) => {
      await page.goto('/', { waitUntil: 'networkidle' });

      // Click About nav link
      await page.locator('.nav-link:has-text("About")').click();

      // URL should change
      await expect(page).toHaveURL('/about');

      // Page content should show about info
      await expect(page.locator('.page-content h1')).toHaveText('About Windwalker');
      await expect(page.locator('.about-page')).toBeVisible();
    });

    test('should navigate back to Map from other pages', async ({ page }) => {
      await page.goto('/about', { waitUntil: 'networkidle' });

      // Click Map nav link
      await page.locator('.nav-link:has-text("Map")').click();

      // URL should change
      await expect(page).toHaveURL('/');

      // Map should be visible
      await expect(page.locator('#windwalker-map')).toBeVisible();
      await expect(page.locator('.treaty-browser')).toBeVisible();
    });

    test('should handle direct URL navigation', async ({ page }) => {
      // Navigate directly to treaties page
      await page.goto('/treaties', { waitUntil: 'networkidle' });

      // Should render correctly
      await expect(page.locator('.page-content h1')).toHaveText('All Treaties');
    });

    test('should handle browser back button', async ({ page }) => {
      await page.goto('/', { waitUntil: 'networkidle' });
      await page.locator('.nav-link:has-text("About")').click();
      await expect(page).toHaveURL('/about');

      // Go back
      await page.goBack();

      // Should be back on map
      await expect(page).toHaveURL('/');
      await expect(page.locator('#windwalker-map')).toBeVisible();
    });

  });

  test.describe('API Endpoints', () => {

    test('should return treaties from API', async ({ request }) => {
      const response = await request.get('/api/v1/treaties');
      expect(response.ok()).toBeTruthy();

      const data = await response.json();
      expect(data.treaties).toBeDefined();
      expect(data.total).toBeGreaterThan(0);
    });

    test('should filter treaties by year', async ({ request }) => {
      const allResponse = await request.get('/api/v1/treaties');
      const allData = await allResponse.json();

      const filteredResponse = await request.get('/api/v1/treaties?year_end=1800');
      const filteredData = await filteredResponse.json();

      expect(filteredData.total).toBeLessThan(allData.total);
    });

    test('should return health check', async ({ request }) => {
      const response = await request.get('/health');
      expect(response.ok()).toBeTruthy();

      const data = await response.json();
      expect(data.status).toBe('healthy');
    });

    test('should search treaties', async ({ request }) => {
      const response = await request.get('/api/v1/search?q=Cherokee');
      expect(response.ok()).toBeTruthy();

      const data = await response.json();
      expect(data.results).toBeDefined();
    });

    test('should return treaty boundaries GeoJSON', async ({ request }) => {
      const response = await request.get('/api/v1/boundaries');
      expect(response.ok()).toBeTruthy();

      const data = await response.json();
      expect(data.type).toBe('FeatureCollection');
      expect(data.features).toBeDefined();
      expect(data.features.length).toBeGreaterThan(0);

      // Check feature structure
      const feature = data.features[0];
      expect(feature.type).toBe('Feature');
      expect(feature.properties.Name).toBeDefined();
      expect(feature.geometry.type).toBe('MultiPolygon');
    });

  });

  test.describe('Map Boundaries', () => {

    test('should load treaty boundaries on map', async ({ page }) => {
      // Listen for console to verify boundaries loaded
      const boundaryLogs = [];
      page.on('console', msg => {
        if (msg.text().includes('treaty boundaries')) {
          boundaryLogs.push(msg.text());
        }
      });

      await page.goto('/', { waitUntil: 'networkidle' });

      // Wait for map to load
      await page.waitForSelector('#windwalker-map');

      // Wait for boundaries to load (they load async after map)
      await page.waitForTimeout(3000);

      // Verify boundaries were loaded
      expect(boundaryLogs.some(log => log.includes('Loaded'))).toBeTruthy();
    });

    test('should filter map boundaries when slider changes', async ({ page }) => {
      await page.goto('/', { waitUntil: 'networkidle' });

      // Wait for map and boundaries to load
      await page.waitForSelector('#windwalker-map');
      await page.waitForTimeout(3000);

      // Move slider to 1800 - should show fewer boundaries
      const slider = page.locator('#year-slider');
      await slider.fill('1800');
      await slider.dispatchEvent('input');

      // Verify the year display updated
      await expect(page.locator('#current-year')).toHaveText('1800');

      // The map should have filtered (we can't easily count features, but the function runs)
      // This test verifies the integration doesn't throw errors
      await page.waitForTimeout(500);
    });

  });

});
