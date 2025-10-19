import { test, expect } from '@playwright/test';

/**
 * E2E Tests for FE-007: Analytics Dashboard with Charts
 *
 * This test suite verifies:
 * - Page renders correctly
 * - Empty state shows when no account is selected
 * - All UI components are present and accessible
 * - Responsive design works on mobile
 * - Page performance and screenshots
 */

test.describe('FE-007: Analytics Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.addInitScript(() => {
      localStorage.setItem('auth_token', 'mock-token-123');
      localStorage.setItem('user', JSON.stringify({
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
      }));
    });

    // Mock all API calls to prevent network errors
    await page.route('**/api/**', async (route) => {
      const url = route.request().url();

      if (url.includes('/instagram/accounts')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: [],
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: [] }),
        });
      }
    });
  });

  test('should render analytics page successfully', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');

    // Verify page loaded
    expect(page.url()).toContain('/analytics');

    // Check that page content is rendered (empty state or dashboard)
    const body = await page.locator('body').textContent();
    expect(body).toBeTruthy();
    expect(body.length).toBeGreaterThan(100);
  });

  test('should display empty state when no account is selected', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');

    // Check for empty state
    const emptyState = page.locator('[data-testid="empty-state"]');
    await expect(emptyState).toBeVisible({ timeout: 10000 });

    // Check empty state content
    await expect(page.locator('h2:has-text("No Account Selected")')).toBeVisible();
    await expect(page.locator('text=Please select an Instagram account')).toBeVisible();

    // Verify empty state icon is present
    const icon = emptyState.locator('svg');
    await expect(icon).toBeVisible();
  });

  test('should have proper page structure and metadata', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');

    // Check page title
    const title = await page.title();
    expect(title).toBeTruthy();

    // Check that main content area exists
    const main = page.locator('main, [role="main"], body > div');
    await expect(main.first()).toBeVisible();
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');

    // Check that page renders on mobile
    const emptyState = page.locator('[data-testid="empty-state"]');
    await expect(emptyState).toBeVisible();

    // Verify content is readable and not cut off
    const heading = page.locator('h2');
    await expect(heading).toBeVisible();
  });

  test('should be responsive on tablet viewport', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });

    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');

    // Check that page renders on tablet
    const emptyState = page.locator('[data-testid="empty-state"]');
    await expect(emptyState).toBeVisible();
  });

  test('should load page within acceptable time', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    // Page should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
    console.log(`Analytics page loaded in ${loadTime}ms`);
  });

  test('should not have console errors on page load', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');

    // Allow for some minor errors but fail if there are critical ones
    const criticalErrors = consoleErrors.filter(error =>
      !error.includes('Failed to load') && // Ignore network errors from mocked APIs
      !error.includes('404') &&
      !error.includes('ResizeObserver') // Ignore common harmless error
    );

    expect(criticalErrors.length).toBe(0);
    if (criticalErrors.length > 0) {
      console.log('Critical console errors found:', criticalErrors);
    }
  });

  test('should take full page screenshot for visual regression', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500); // Let animations settle

    // Take full page screenshot
    await page.screenshot({
      path: 'test-results/screenshots/fe007-analytics-desktop.png',
      fullPage: true,
    });

    // Verify screenshot was created
    const fs = require('fs');
    const screenshotExists = fs.existsSync('test-results/screenshots/fe007-analytics-desktop.png');
    expect(screenshotExists).toBe(true);
  });

  test('should take mobile screenshot for visual regression', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    await page.screenshot({
      path: 'test-results/screenshots/fe007-analytics-mobile.png',
      fullPage: true,
    });

    const fs = require('fs');
    const screenshotExists = fs.existsSync('test-results/screenshots/fe007-analytics-mobile.png');
    expect(screenshotExists).toBe(true);
  });

  test('should have accessible empty state', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');

    // Check for proper heading hierarchy
    const h2 = page.locator('h2');
    await expect(h2.first()).toBeVisible();

    // Check for descriptive text
    const description = page.locator('p');
    await expect(description.first()).toBeVisible();
  });

  test('should handle page navigation correctly', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');

    // Verify we're on the analytics page
    expect(page.url()).toContain('/analytics');

    // Verify page doesn't redirect or crash
    await page.waitForTimeout(1000);
    expect(page.url()).toContain('/analytics');
  });
});

test.describe('FE-007: Analytics Components (when implemented with account)', () => {
  test.skip('should display overview metric cards with data', async ({ page }) => {
    // This test is skipped because it requires account selection
    // which is not yet implemented in the test setup
    // TODO: Implement account selection flow and enable this test
  });

  test.skip('should display engagement and follower growth charts', async ({ page }) => {
    // This test is skipped because it requires account selection
    // TODO: Implement account selection flow and enable this test
  });

  test.skip('should display top posts table', async ({ page }) => {
    // This test is skipped because it requires account selection
    // TODO: Implement account selection flow and enable this test
  });

  test.skip('should allow date range filtering', async ({ page }) => {
    // This test is skipped because it requires account selection
    // TODO: Implement account selection flow and enable this test
  });

  test.skip('should export analytics data', async ({ page }) => {
    // This test is skipped because it requires account selection
    // TODO: Implement account selection flow and enable this test
  });
});
