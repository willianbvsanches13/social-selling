import { test, expect } from '@playwright/test';

/**
 * E2E Tests for FE-007: Analytics Dashboard with Charts
 * These tests properly handle authentication and test the actual dashboard
 */

test.describe('FE-007: Analytics Dashboard (Authenticated)', () => {
  test.beforeEach(async ({ page, context }) => {
    // Set up authentication tokens in cookies (for middleware)
    await context.addCookies([
      {
        name: 'accessToken',
        value: 'mock-access-token-123456',
        domain: 'localhost',
        path: '/',
        httpOnly: false,
        sameSite: 'Strict',
        expires: Date.now() / 1000 + 3600, // 1 hour from now
      },
      {
        name: 'refreshToken',
        value: 'mock-refresh-token-123456',
        domain: 'localhost',
        path: '/',
        httpOnly: false,
        sameSite: 'Strict',
        expires: Date.now() / 1000 + 604800, // 7 days from now
      },
    ]);

    // Set up authentication in localStorage and Zustand store
    await page.addInitScript(() => {
      // Set tokens in localStorage
      localStorage.setItem('accessToken', 'mock-access-token-123456');
      localStorage.setItem('refreshToken', 'mock-refresh-token-123456');

      // Set Zustand auth store
      const authState = {
        state: {
          user: {
            id: '123',
            email: 'test@example.com',
            name: 'Test User',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          isAuthenticated: true,
          tokens: {
            accessToken: 'mock-access-token-123456',
            refreshToken: 'mock-refresh-token-123456',
            expiresIn: 3600,
          },
          isLoading: false,
        },
        version: 0,
      };

      localStorage.setItem('auth-storage', JSON.stringify(authState));
    });

    // Mock all API endpoints
    await page.route('**/api/**', async (route) => {
      const url = route.request().url();
      const method = route.request().method();

      // Auth verification endpoint
      if (url.includes('/auth/me') || url.includes('/auth/verify')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: '123',
              email: 'test@example.com',
              name: 'Test User',
            },
          }),
        });
      }

      // Instagram accounts endpoint
      if (url.includes('/instagram/accounts')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: [
              {
                id: 'acc-1',
                instagramAccountId: '17841400000000000',
                username: 'testaccount',
                profilePictureUrl: 'https://via.placeholder.com/150',
                followerCount: 15234,
                followingCount: 500,
                status: 'active',
                accessToken: 'encrypted_token',
                userId: '123',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ],
          }),
        });
      }

      // Analytics overview endpoint
      if (url.includes('/analytics/overview')) {
        return route.fulfill({
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
      }

      // Analytics engagement data endpoint
      if (url.includes('/analytics/engagement')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: [
              { date: '2025-10-01', engagement: 230, reach: 5000, impressions: 8000 },
              { date: '2025-10-02', engagement: 275, reach: 5500, impressions: 8500 },
              { date: '2025-10-03', engagement: 248, reach: 5200, impressions: 8200 },
              { date: '2025-10-04', engagement: 290, reach: 5800, impressions: 9000 },
              { date: '2025-10-05', engagement: 310, reach: 6000, impressions: 9500 },
            ],
          }),
        });
      }

      // Analytics follower growth endpoint
      if (url.includes('/analytics/followers')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: [
              { date: '2025-10-01', followers: 15000, newFollowers: 50, unfollows: 10 },
              { date: '2025-10-02', followers: 15050, newFollowers: 60, unfollows: 10 },
              { date: '2025-10-03', followers: 15100, newFollowers: 70, unfollows: 20 },
              { date: '2025-10-04', followers: 15150, newFollowers: 65, unfollows: 15 },
              { date: '2025-10-05', followers: 15234, newFollowers: 90, unfollows: 6 },
            ],
          }),
        });
      }

      // Analytics top posts endpoint
      if (url.includes('/analytics/top-posts')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: [
              {
                id: '1',
                caption: 'Amazing sunset at the beach 🌅',
                thumbnailUrl: 'https://via.placeholder.com/150/FF6B6B',
                mediaType: 'IMAGE',
                likes: 1234,
                comments: 89,
                shares: 45,
                saves: 67,
                engagement: 1435,
                reach: 5678,
                impressions: 8901,
                engagementRate: 25.27,
                timestamp: '2025-10-15T10:00:00Z',
                permalink: 'https://instagram.com/p/test1',
              },
              {
                id: '2',
                caption: 'New product launch! Check it out 🚀',
                thumbnailUrl: 'https://via.placeholder.com/150/4ECDC4',
                mediaType: 'IMAGE',
                likes: 987,
                comments: 76,
                shares: 34,
                saves: 56,
                engagement: 1153,
                reach: 4567,
                impressions: 7890,
                engagementRate: 25.25,
                timestamp: '2025-10-14T14:30:00Z',
                permalink: 'https://instagram.com/p/test2',
              },
              {
                id: '3',
                caption: 'Behind the scenes of our latest shoot 📸',
                thumbnailUrl: 'https://via.placeholder.com/150/95E1D3',
                mediaType: 'VIDEO',
                likes: 876,
                comments: 65,
                shares: 28,
                saves: 45,
                engagement: 1014,
                reach: 3456,
                impressions: 6789,
                engagementRate: 29.34,
                timestamp: '2025-10-13T09:15:00Z',
                permalink: 'https://instagram.com/p/test3',
              },
            ],
          }),
        });
      }

      // Default fallback for other endpoints
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      });
    });
  });

  test('should successfully load analytics page when authenticated', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');

    // Verify we're on the analytics page (not redirected to login)
    expect(page.url()).toContain('/analytics');
    expect(page.url()).not.toContain('/login');

    // Verify page content loaded
    const title = await page.textContent('h1');
    expect(title).toContain('Analytics Dashboard');
  });

  test('should display all four overview metric cards', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');

    // Wait for data to load
    await page.waitForTimeout(2000);

    // Check for all four metric cards
    const metricCards = page.locator('[data-testid^="metric-"]');
    const count = await metricCards.count();
    expect(count).toBeGreaterThanOrEqual(4);

    // Verify specific metrics are visible
    await expect(page.locator('[data-testid="metric-total-followers"]')).toBeVisible();
    await expect(page.locator('[data-testid="metric-total-reach"]')).toBeVisible();
    await expect(page.locator('[data-testid="metric-total-engagement"]')).toBeVisible();
    await expect(page.locator('[data-testid="metric-engagement-rate"]')).toBeVisible();
  });

  test('should display metric values correctly', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check Total Followers card
    const followersCard = page.locator('[data-testid="metric-total-followers"]');
    await expect(followersCard).toContainText('15.2K'); // 15234 formatted
    await expect(followersCard).toContainText('+12.5%');

    // Check Total Reach card
    const reachCard = page.locator('[data-testid="metric-total-reach"]');
    await expect(reachCard).toContainText('45.7K'); // 45678 formatted

    // Check Engagement Rate card
    const engagementRateCard = page.locator('[data-testid="metric-engagement-rate"]');
    await expect(engagementRateCard).toContainText('7.56%');
  });

  test('should display engagement trend chart', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check chart title
    await expect(page.locator('h2:has-text("Engagement Trend")')).toBeVisible();

    // Check chart is rendered
    const engagementChart = page.locator('[data-testid="engagement-chart"]');
    await expect(engagementChart).toBeVisible();

    // Verify SVG chart is rendered (Recharts uses SVG)
    const svg = engagementChart.locator('svg');
    await expect(svg).toBeVisible();
  });

  test('should display follower growth chart', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check chart title
    await expect(page.locator('h2:has-text("Follower Growth")')).toBeVisible();

    // Check chart is rendered
    const followerChart = page.locator('[data-testid="follower-growth-chart"]');
    await expect(followerChart).toBeVisible();

    // Verify SVG chart is rendered
    const svg = followerChart.locator('svg');
    await expect(svg).toBeVisible();
  });

  test('should display top posts table with data', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check table title
    await expect(page.locator('h2:has-text("Top Performing Posts")')).toBeVisible();

    // Check table is rendered
    const table = page.locator('[data-testid="top-posts-table"]');
    await expect(table).toBeVisible();

    // Verify table has posts
    const posts = table.locator('div[class*="grid"]').filter({ hasText: 'Amazing sunset' });
    await expect(posts.first()).toBeVisible();
  });

  test('should display date range selector', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');

    // Check date range selector is visible
    const selector = page.locator('[data-testid="date-range-selector"]');
    await expect(selector).toBeVisible();

    // Check for date range buttons
    await expect(selector.locator('button:has-text("Today")')).toBeVisible();
    await expect(selector.locator('button:has-text("Last 7 days")')).toBeVisible();
    await expect(selector.locator('button:has-text("Last 30 days")')).toBeVisible();
    await expect(selector.locator('button:has-text("Last 90 days")')).toBeVisible();
  });

  test('should display export button', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');

    // Check export button is visible
    const exportBtn = page.locator('[data-testid="export-button"]');
    await expect(exportBtn).toBeVisible();
    await expect(exportBtn).toContainText('Export CSV');
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check that page renders on mobile
    await expect(page.locator('h1:has-text("Analytics Dashboard")')).toBeVisible();

    // Check metric cards stack vertically
    const cards = page.locator('[data-testid^="metric-"]');
    expect(await cards.count()).toBeGreaterThanOrEqual(4);
  });

  test('should take full dashboard screenshot', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000); // Wait for all charts to render

    // Take screenshot
    await page.screenshot({
      path: 'test-results/screenshots/fe007-analytics-full-desktop.png',
      fullPage: true,
    });

    // Verify screenshot exists
    const fs = require('fs');
    const exists = fs.existsSync('test-results/screenshots/fe007-analytics-full-desktop.png');
    expect(exists).toBe(true);
  });

  test('should take mobile dashboard screenshot', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    await page.screenshot({
      path: 'test-results/screenshots/fe007-analytics-full-mobile.png',
      fullPage: true,
    });

    const fs = require('fs');
    const exists = fs.existsSync('test-results/screenshots/fe007-analytics-full-mobile.png');
    expect(exists).toBe(true);
  });

  test('should load page within acceptable time', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    // Page should load within 10 seconds (including API calls)
    expect(loadTime).toBeLessThan(10000);
    console.log(`✓ Analytics dashboard loaded in ${loadTime}ms`);
  });

  test('should have no critical console errors', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Filter out non-critical errors
    const criticalErrors = consoleErrors.filter(
      (error) =>
        !error.includes('Failed to load') &&
        !error.includes('404') &&
        !error.includes('ResizeObserver') &&
        !error.includes('Hydration')
    );

    if (criticalErrors.length > 0) {
      console.log('Console errors found:', criticalErrors);
    }

    expect(criticalErrors.length).toBe(0);
  });
});
