import { Page, expect } from '@playwright/test';

/**
 * Wait for page to be fully loaded
 */
export async function waitForPageLoad(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.waitForLoadState('domcontentloaded');
}

/**
 * Wait for API response
 */
export async function waitForApiResponse(
  page: Page,
  urlPattern: string | RegExp,
  timeout = 10000
): Promise<void> {
  await page.waitForResponse(
    (response) => {
      const url = response.url();
      if (typeof urlPattern === 'string') {
        return url.includes(urlPattern);
      }
      return urlPattern.test(url);
    },
    { timeout }
  );
}

/**
 * Take screenshot with custom name
 */
export async function takeScreenshot(
  page: Page,
  name: string
): Promise<void> {
  await page.screenshot({
    path: `test-results/screenshots/${name}-${Date.now()}.png`,
    fullPage: true,
  });
}

/**
 * Check if element is visible
 */
export async function expectVisible(
  page: Page,
  selector: string
): Promise<void> {
  await expect(page.locator(selector)).toBeVisible();
}

/**
 * Check if element contains text
 */
export async function expectText(
  page: Page,
  selector: string,
  text: string | RegExp
): Promise<void> {
  await expect(page.locator(selector)).toContainText(text);
}

/**
 * Mock API route with custom response
 */
export async function mockApiRoute(
  page: Page,
  urlPattern: string | RegExp,
  response: any,
  status = 200
): Promise<void> {
  await page.route(urlPattern, async (route) => {
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });
}

/**
 * Simulate loading state delay
 */
export async function simulateLoading(
  page: Page,
  duration = 1000
): Promise<void> {
  await page.waitForTimeout(duration);
}

/**
 * Check if chart/graph is rendered
 */
export async function expectChartRendered(
  page: Page,
  chartSelector: string
): Promise<void> {
  const chart = page.locator(chartSelector);
  await expect(chart).toBeVisible();

  // Check if chart has SVG elements (Recharts renders SVG)
  const svg = chart.locator('svg');
  await expect(svg).toBeVisible();

  // Verify chart has actual data rendered
  const paths = svg.locator('path, rect, circle, line');
  const count = await paths.count();
  expect(count).toBeGreaterThan(0);
}

/**
 * Navigate and wait for analytics page
 */
export async function navigateToAnalytics(page: Page): Promise<void> {
  await page.goto('/analytics');
  await waitForPageLoad(page);
}

/**
 * Select date range
 */
export async function selectDateRange(
  page: Page,
  range: '7d' | '30d' | '90d' | 'custom'
): Promise<void> {
  const button = page.locator(`button:has-text("${range === '7d' ? '7 days' : range === '30d' ? '30 days' : range === '90d' ? '90 days' : 'Custom'}")`);
  await button.click();
}

/**
 * Get table row count
 */
export async function getTableRowCount(
  page: Page,
  tableSelector: string
): Promise<number> {
  const rows = page.locator(`${tableSelector} tbody tr`);
  return await rows.count();
}
