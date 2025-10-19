import { test, expect } from '@playwright/test';

/**
 * Simplified Analytics Dashboard E2E Tests for FE-007
 * These tests verify the UI components render correctly with mocked data
 */

test.describe('Analytics Dashboard - Simple UI Tests', () => {
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

    // Mock all API calls
    await page.route('**/api/**', async (route) => {
      const url = route.request().url();

      if (url.includes('/instagram/accounts')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: [
              {
                id: 'acc-1',
                username: '@testaccount',
                profilePictureUrl: 'https://via.placeholder.com/150',
                followerCount: 15234,
                status: 'active',
              },
            ],
          }),
        });
      } else if (url.includes('/analytics/overview')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              totalFollowers: 15234,
              followerChange: 12.5,
              totalReach: 45678,
              reachChange: 8.2,
              totalEngagement: 3456,
              engagementChange: -3.1,
              engagementRate: 7.56,
              engagementRateChange: 2.3,
            },
          }),
        });
      } else if (url.includes('/analytics/engagement')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: [
              { date: '2025-10-01', engagement: 230, reach: 5000, impressions: 8000 },
              { date: '2025-10-02', engagement: 275, reach: 5500, impressions: 8500 },
              { date: '2025-10-03', engagement: 248, reach: 5200, impressions: 8200 },
            ],
          }),
        });
      } else if (url.includes('/analytics/followers')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: [
              { date: '2025-10-01', followers: 15000, newFollowers: 50 },
              { date: '2025-10-02', followers: 15100, newFollowers: 100 },
              { date: '2025-10-03', followers: 15234, newFollowers: 134 },
            ],
          }),
        });
      } else if (url.includes('/analytics/top-posts')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: [
              {
                id: '1',
                caption: 'Amazing sunset at the beach',
                thumbnailUrl: 'https://via.placeholder.com/150',
                mediaType: 'IMAGE',
                likes: 1234,
                comments: 89,
                shares: 45,
                engagement: 1368,
                reach: 5678,
                engagementRate: 8.5,
                timestamp: '2025-10-15T10:00:00Z',
                permalink: 'https://instagram.com/p/test1',
              },
            ],
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

  test('should load analytics page and show empty state when no account selected', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');

    // Check for empty state
    const emptyState = page.locator('[data-testid="empty-state"]');
    await expect(emptyState).toBeVisible();

    // Check empty state message
    await expect(page.locator('h2:has-text("No Account Selected")')).toBeVisible();
    await expect(page.locator('text=Please select an Instagram account')).toBeVisible();
  });

  test('should display overview metric cards', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');

    // Wait for metrics to load
    await page.waitForTimeout(1000);

    // Check for at least one metric card
    const metricCards = page.locator('[data-testid^="metric-"]');
    const count = await metricCards.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('should display charts section', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');

    // Wait for charts to render
    await page.waitForTimeout(1500);

    // Check for chart titles
    await expect(page.locator('h2:has-text("Engagement Trend")')).toBeVisible();
    await expect(page.locator('h2:has-text("Follower Growth")')).toBeVisible();
  });

  test('should display top posts table', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');

    // Wait for data to load
    await page.waitForTimeout(1000);

    // Check for table title
    await expect(page.locator('h2:has-text("Top Performing Posts")')).toBeVisible();
  });

  test('should have date range selector', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');

    // Check for date range selector
    const selector = page.locator('[data-testid="date-range-selector"]');
    await expect(selector).toBeVisible();
  });

  test('should have export button', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');

    // Check for export button
    const exportBtn = page.locator('[data-testid="export-button"]');
    await expect(exportBtn).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');

    // Check that page still renders
    await expect(page.locator('h1')).toBeVisible();
  });

  test('should take screenshot of dashboard', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');

    // Wait for all content to load
    await page.waitForTimeout(2000);

    // Take a screenshot
    await page.screenshot({
      path: 'test-results/screenshots/analytics-dashboard.png',
      fullPage: true,
    });
  });
});
