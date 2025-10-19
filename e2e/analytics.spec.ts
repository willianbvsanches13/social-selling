import { test, expect, Page } from '@playwright/test';
import { mockAuthSession } from './fixtures/auth';
import {
  mockAnalyticsOverview,
  mockEngagementData,
  mockFollowerData,
  mockTopPosts,
  mockInstagramAccounts,
} from './fixtures/analytics';
import {
  mockApiRoute,
  waitForPageLoad,
  expectVisible,
  expectText,
  expectChartRendered,
  navigateToAnalytics,
  getTableRowCount,
} from './utils/test-helpers';

test.describe('Analytics Dashboard - FE-007', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await mockAuthSession(page);

    // Mock API endpoints
    await mockApiRoute(
      page,
      '**/api/instagram/accounts',
      {
        success: true,
        data: mockInstagramAccounts,
      }
    );

    await mockApiRoute(
      page,
      '**/api/analytics/overview**',
      {
        success: true,
        data: mockAnalyticsOverview,
      }
    );

    await mockApiRoute(
      page,
      '**/api/analytics/engagement**',
      {
        success: true,
        data: mockEngagementData,
      }
    );

    await mockApiRoute(
      page,
      '**/api/analytics/followers**',
      {
        success: true,
        data: mockFollowerData,
      }
    );

    await mockApiRoute(
      page,
      '**/api/analytics/top-posts**',
      {
        success: true,
        data: mockTopPosts,
      }
    );
  });

  test('should display page title and description', async ({ page }) => {
    await navigateToAnalytics(page);

    // Check page title
    await expectText(page, 'h1', 'Analytics Dashboard');

    // Check page description
    await expectText(page, 'p', 'Track your Instagram performance and insights');
  });

  test('should show empty state when no account is selected', async ({ page }) => {
    // Mock empty accounts
    await mockApiRoute(
      page,
      '**/api/instagram/accounts',
      {
        success: true,
        data: [],
      }
    );

    await navigateToAnalytics(page);

    // Check for empty state icon and message
    await expectVisible(page, '[data-testid="empty-state"]');
    await expectText(page, 'h2', 'No Account Selected');
    await expectText(page, 'p', 'Please select an Instagram account');
  });

  test('should display all overview metric cards', async ({ page }) => {
    await navigateToAnalytics(page);
    await waitForPageLoad(page);

    // Check Total Followers card
    await expectVisible(page, '[data-testid="metric-total-followers"]');
    await expectText(page, '[data-testid="metric-total-followers"]', '15.2K');
    await expectText(page, '[data-testid="metric-total-followers"]', '+12.5%');

    // Check Total Reach card
    await expectVisible(page, '[data-testid="metric-total-reach"]');
    await expectText(page, '[data-testid="metric-total-reach"]', '45.7K');
    await expectText(page, '[data-testid="metric-total-reach"]', '+8.2%');

    // Check Total Engagement card
    await expectVisible(page, '[data-testid="metric-total-engagement"]');
    await expectText(page, '[data-testid="metric-total-engagement"]', '3.5K');
    await expectText(page, '[data-testid="metric-total-engagement"]', '-3.1%');

    // Check Engagement Rate card
    await expectVisible(page, '[data-testid="metric-engagement-rate"]');
    await expectText(page, '[data-testid="metric-engagement-rate"]', '7.56%');
    await expectText(page, '[data-testid="metric-engagement-rate"]', '+2.3%');
  });

  test('should display overview cards with loading state', async ({ page }) => {
    // Delay the API response to see loading state
    await page.route('**/api/analytics/overview**', async (route) => {
      await page.waitForTimeout(2000); // Simulate slow API
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: mockAnalyticsOverview,
        }),
      });
    });

    await navigateToAnalytics(page);

    // Check for skeleton loaders
    const skeletons = page.locator('[data-testid="metric-skeleton"]');
    expect(await skeletons.count()).toBeGreaterThan(0);
  });

  test('should display positive and negative changes correctly', async ({ page }) => {
    await navigateToAnalytics(page);
    await waitForPageLoad(page);

    // Positive change should have green color
    const positiveChange = page.locator('[data-testid="metric-total-followers"] [data-testid="change-positive"]');
    await expect(positiveChange).toBeVisible();
    await expect(positiveChange).toHaveClass(/text-green/);

    // Negative change should have red color
    const negativeChange = page.locator('[data-testid="metric-total-engagement"] [data-testid="change-negative"]');
    await expect(negativeChange).toBeVisible();
    await expect(negativeChange).toHaveClass(/text-red/);
  });

  test('should display engagement trend chart', async ({ page }) => {
    await navigateToAnalytics(page);
    await waitForPageLoad(page);

    // Check chart title
    await expectText(page, 'h2', 'Engagement Trend');

    // Verify chart is rendered with data
    await expectChartRendered(page, '[data-testid="engagement-chart"]');

    // Check for chart legend
    await expectVisible(page, '[data-testid="engagement-chart"] .recharts-legend-wrapper');

    // Check for tooltip on hover (Recharts tooltip)
    const chartArea = page.locator('[data-testid="engagement-chart"] .recharts-surface');
    await chartArea.hover({ position: { x: 100, y: 100 } });
  });

  test('should display follower growth chart', async ({ page }) => {
    await navigateToAnalytics(page);
    await waitForPageLoad(page);

    // Check chart title
    await expectText(page, 'h2', 'Follower Growth');

    // Verify chart is rendered with data
    await expectChartRendered(page, '[data-testid="follower-growth-chart"]');

    // Check for area chart path (AreaChart renders path elements)
    const areaPath = page.locator('[data-testid="follower-growth-chart"] .recharts-area-area');
    await expect(areaPath).toBeVisible();
  });

  test('should display charts with loading state', async ({ page }) => {
    // Delay the API response
    await page.route('**/api/analytics/engagement**', async (route) => {
      await page.waitForTimeout(2000);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: mockEngagementData,
        }),
      });
    });

    await navigateToAnalytics(page);

    // Check for chart skeleton
    await expectVisible(page, '[data-testid="chart-skeleton"]');
  });

  test('should display top posts table with all columns', async ({ page }) => {
    await navigateToAnalytics(page);
    await waitForPageLoad(page);

    // Check table title
    await expectText(page, 'h2', 'Top Performing Posts');

    // Verify table is rendered
    await expectVisible(page, '[data-testid="top-posts-table"]');

    // Check table headers
    await expectText(page, 'th', 'Post');
    await expectText(page, 'th', 'Likes');
    await expectText(page, 'th', 'Comments');
    await expectText(page, 'th', 'Shares');
    await expectText(page, 'th', 'Engagement Rate');

    // Verify table has correct number of rows
    const rowCount = await getTableRowCount(page, '[data-testid="top-posts-table"]');
    expect(rowCount).toBe(5); // mockTopPosts has 5 items
  });

  test('should display post data correctly in table', async ({ page }) => {
    await navigateToAnalytics(page);
    await waitForPageLoad(page);

    // Check first post data
    const firstRow = page.locator('[data-testid="top-posts-table"] tbody tr').first();

    // Check caption
    await expect(firstRow.locator('td').first()).toContainText('Amazing sunset');

    // Check metrics
    await expect(firstRow).toContainText('1,234'); // likes
    await expect(firstRow).toContainText('89'); // comments
    await expect(firstRow).toContainText('45'); // shares
    await expect(firstRow).toContainText('8.5%'); // engagement rate
  });

  test('should show table loading state', async ({ page }) => {
    await page.route('**/api/analytics/top-posts**', async (route) => {
      await page.waitForTimeout(2000);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: mockTopPosts,
        }),
      });
    });

    await navigateToAnalytics(page);

    // Check for table skeleton
    await expectVisible(page, '[data-testid="table-skeleton"]');
  });

  test('should show empty state when no top posts', async ({ page }) => {
    await mockApiRoute(
      page,
      '**/api/analytics/top-posts**',
      {
        success: true,
        data: [],
      }
    );

    await navigateToAnalytics(page);
    await waitForPageLoad(page);

    // Check for empty state message
    await expectText(page, '[data-testid="top-posts-empty"]', 'No posts found');
  });

  test('should have functional date range selector', async ({ page }) => {
    await navigateToAnalytics(page);
    await waitForPageLoad(page);

    // Check date range selector is visible
    await expectVisible(page, '[data-testid="date-range-selector"]');

    // Check for date range options
    const selector = page.locator('[data-testid="date-range-selector"]');
    await selector.click();

    // Verify dropdown options
    await expectVisible(page, 'button:has-text("7 days")');
    await expectVisible(page, 'button:has-text("30 days")');
    await expectVisible(page, 'button:has-text("90 days")');
    await expectVisible(page, 'button:has-text("Custom")');
  });

  test('should update data when date range changes', async ({ page }) => {
    let apiCallCount = 0;

    await page.route('**/api/analytics/overview**', async (route) => {
      apiCallCount++;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: mockAnalyticsOverview,
        }),
      });
    });

    await navigateToAnalytics(page);
    await waitForPageLoad(page);

    const initialCallCount = apiCallCount;

    // Change date range
    await page.locator('[data-testid="date-range-selector"]').click();
    await page.locator('button:has-text("7 days")').click();

    // Wait for API call
    await page.waitForTimeout(500);

    // Verify new API call was made
    expect(apiCallCount).toBeGreaterThan(initialCallCount);
  });

  test('should have functional export button', async ({ page }) => {
    await navigateToAnalytics(page);
    await waitForPageLoad(page);

    // Check export button is visible
    await expectVisible(page, '[data-testid="export-button"]');

    // Click export button
    const exportButton = page.locator('[data-testid="export-button"]');
    await exportButton.click();

    // Check for export options
    await expectVisible(page, 'button:has-text("CSV")');
    await expectVisible(page, 'button:has-text("PDF")');
  });

  test('should trigger CSV download on export', async ({ page }) => {
    await navigateToAnalytics(page);
    await waitForPageLoad(page);

    // Listen for download event
    const downloadPromise = page.waitForEvent('download');

    // Trigger export
    await page.locator('[data-testid="export-button"]').click();
    await page.locator('button:has-text("CSV")').click();

    // Verify download started
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/analytics.*\.csv/);
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await navigateToAnalytics(page);
    await waitForPageLoad(page);

    // Check that cards stack vertically
    const cards = page.locator('[data-testid^="metric-"]');
    const cardsCount = await cards.count();
    expect(cardsCount).toBe(4);

    // Verify mobile layout
    for (let i = 0; i < cardsCount; i++) {
      const card = cards.nth(i);
      await expect(card).toBeVisible();
    }

    // Check charts are responsive
    await expectVisible(page, '[data-testid="engagement-chart"]');
    await expectVisible(page, '[data-testid="follower-growth-chart"]');
  });

  test('should handle API errors gracefully', async ({ page }) => {
    await mockApiRoute(
      page,
      '**/api/analytics/overview**',
      {
        success: false,
        error: 'Failed to fetch analytics data',
      },
      500
    );

    await navigateToAnalytics(page);
    await waitForPageLoad(page);

    // Check for error message
    await expectVisible(page, '[data-testid="error-message"]');
    await expectText(page, '[data-testid="error-message"]', 'Failed to load analytics');
  });

  test('should show retry button on error', async ({ page }) => {
    let attempts = 0;

    await page.route('**/api/analytics/overview**', async (route) => {
      attempts++;
      if (attempts === 1) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Server error',
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: mockAnalyticsOverview,
          }),
        });
      }
    });

    await navigateToAnalytics(page);
    await waitForPageLoad(page);

    // Click retry button
    await page.locator('[data-testid="retry-button"]').click();

    // Wait for successful reload
    await waitForPageLoad(page);

    // Verify data is now displayed
    await expectVisible(page, '[data-testid="metric-total-followers"]');
  });

  test('should navigate back from analytics page', async ({ page }) => {
    await navigateToAnalytics(page);
    await waitForPageLoad(page);

    // Click back button or sidebar link
    const dashboardLink = page.locator('a[href="/dashboard"]');
    await dashboardLink.click();

    // Verify navigation
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should maintain scroll position when updating data', async ({ page }) => {
    await navigateToAnalytics(page);
    await waitForPageLoad(page);

    // Scroll to bottom
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    const scrollBefore = await page.evaluate(() => window.scrollY);

    // Trigger data refresh
    await page.locator('[data-testid="refresh-button"]').click();
    await page.waitForTimeout(500);

    const scrollAfter = await page.evaluate(() => window.scrollY);

    // Verify scroll position is maintained
    expect(Math.abs(scrollAfter - scrollBefore)).toBeLessThan(50);
  });

  test('should display correct icon for each metric card', async ({ page }) => {
    await navigateToAnalytics(page);
    await waitForPageLoad(page);

    // Check icons are present (using lucide-react icons)
    await expectVisible(page, '[data-testid="metric-total-followers"] svg');
    await expectVisible(page, '[data-testid="metric-total-reach"] svg');
    await expectVisible(page, '[data-testid="metric-total-engagement"] svg');
    await expectVisible(page, '[data-testid="metric-engagement-rate"] svg');
  });

  test('should format large numbers correctly', async ({ page }) => {
    await mockApiRoute(
      page,
      '**/api/analytics/overview**',
      {
        success: true,
        data: {
          ...mockAnalyticsOverview,
          totalFollowers: 1234567, // Should display as 1.2M
          totalReach: 567890, // Should display as 567.9K
        },
      }
    );

    await navigateToAnalytics(page);
    await waitForPageLoad(page);

    // Check formatted numbers
    await expectText(page, '[data-testid="metric-total-followers"]', '1.2M');
    await expectText(page, '[data-testid="metric-total-reach"]', '567.9K');
  });
});
