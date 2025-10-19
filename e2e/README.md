# E2E Test Suite for Social Selling Platform

## Overview

This directory contains end-to-end (E2E) tests built with [Playwright](https://playwright.dev/) to ensure the quality and functionality of the Social Selling Platform.

## Test Coverage

### FE-007: Analytics Dashboard Tests

Location: `e2e/analytics-fe007.spec.ts`

**Test Results:**
- ✅ **6 tests passing**
- ⏭️ **5 tests skipped** (require full authentication flow)
- ❌ **5 tests failing** (authentication redirect issues)

**Passing Tests:**
1. ✅ Page structure and metadata validation
2. ✅ Page load performance (<5 seconds)
3. ✅ No critical console errors
4. ✅ Full page screenshot capture (desktop)
5. ✅ Mobile viewport screenshot capture
6. ✅ Accessibility validation for empty states

**Test Artifacts:**
- Desktop screenshot: `test-results/screenshots/fe007-analytics-desktop.png`
- Mobile screenshot: `test-results/screenshots/fe007-analytics-mobile.png`
- Video recordings: `test-results/`
- HTML report: `playwright-report/`

## Running Tests

### Prerequisites

```bash
# Install Playwright browsers (one-time setup)
npm run test:e2e -- --install
```

### Run All Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run specific test file
npm run test:e2e -- e2e/analytics-fe007.spec.ts

# Run tests in headed mode (see browser)
npm run test:e2e:headed

# Run tests in UI mode (interactive)
npm run test:e2e:ui

# Run tests in debug mode
npm run test:e2e:debug
```

### View Test Reports

```bash
# View HTML report after tests complete
npm run test:e2e:report
```

## Test Structure

```
e2e/
├── README.md                      # This file
├── fixtures/                      # Test data and mocks
│   ├── auth.ts                   # Authentication fixtures
│   └── analytics.ts              # Analytics data mocks
├── utils/                         # Test helper utilities
│   └── test-helpers.ts           # Reusable test functions
├── analytics.spec.ts             # Comprehensive analytics tests (blocked by auth)
├── analytics-simple.spec.ts      # Simple analytics tests
└── analytics-fe007.spec.ts       # FE-007 specific tests ✅ IN USE
```

## Configuration

Playwright configuration: `playwright.config.ts`

Key settings:
- Base URL: `http://localhost:3000`
- Test directory: `./e2e`
- Browsers: Chromium (Chrome)
- Reporters: HTML, List, JUnit
- Screenshots: On failure only
- Videos: Retained on failure

## Test Data Attributes

Components use `data-testid` attributes for stable test selectors:

**Analytics Dashboard:**
- `[data-testid="empty-state"]` - Empty state when no account selected
- `[data-testid="metric-*"]` - Overview metric cards
- `[data-testid="engagement-chart"]` - Engagement trend chart
- `[data-testid="follower-growth-chart"]` - Follower growth chart
- `[data-testid="top-posts-table"]` - Top posts table
- `[data-testid="date-range-selector"]` - Date range filter
- `[data-testid="export-button"]` - Export functionality

## Known Issues

### Authentication Redirect

Several tests are currently failing because the `/analytics` page requires authentication and redirects to `/login?from=%2Fanalytics`.

**Affected Tests:**
- `should render analytics page successfully`
- `should display empty state when no account is selected`
- `should be responsive on mobile viewport`
- `should be responsive on tablet viewport`
- `should handle page navigation correctly`

**Resolution:** These tests will pass once the authentication flow is properly mocked or when testing with a logged-in session.

### Skipped Tests

Five tests are intentionally skipped because they require account selection functionality:
- Overview metric cards with data
- Engagement and follower growth charts
- Top posts table
- Date range filtering
- Export functionality

**Resolution:** Enable these tests once the account selection flow can be automated in tests.

## Best Practices

### Writing Tests

1. **Use data-testid attributes** instead of CSS selectors
2. **Mock API calls** to ensure predictable test data
3. **Wait for page load** using `waitForLoadState('networkidle')`
4. **Take screenshots** for visual regression testing
5. **Test accessibility** with proper heading hierarchy
6. **Test responsiveness** on multiple viewport sizes

### Example Test

```typescript
test('should display analytics dashboard', async ({ page }) => {
  // Navigate to page
  await page.goto('/analytics');
  await page.waitForLoadState('networkidle');

  // Check element visibility
  const title = page.locator('[data-testid="page-title"]');
  await expect(title).toBeVisible();

  // Take screenshot
  await page.screenshot({ path: 'test-results/dashboard.png' });
});
```

## CI/CD Integration

Tests can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run E2E Tests
  run: npm run test:e2e

- name: Upload Test Results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```

## Troubleshooting

### Tests timeout or hang
- Increase timeout in `playwright.config.ts`
- Check if dev server is running on port 3000
- Verify network is not blocking requests

### Screenshots not generated
- Create directory: `mkdir -p test-results/screenshots`
- Check disk space
- Verify write permissions

### Browser not found
- Run: `npx playwright install chromium`
- Check Playwright version compatibility

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Test Selectors Guide](https://playwright.dev/docs/selectors)
- [API Reference](https://playwright.dev/docs/api/class-test)

## Contributing

When adding new E2E tests:

1. Add appropriate `data-testid` attributes to components
2. Create reusable fixtures in `e2e/fixtures/`
3. Use helper functions from `e2e/utils/test-helpers.ts`
4. Document new test files in this README
5. Ensure tests are deterministic and not flaky
6. Add screenshots for visual verification

---

**Last Updated:** 2025-10-19
**Test Framework:** Playwright v1.56.1
**Coverage:** FE-007 Analytics Dashboard
