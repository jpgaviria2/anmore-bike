# End-to-End Testing Documentation

## Overview

This project uses [Playwright](https://playwright.dev/) for comprehensive end-to-end testing. Tests verify navigation, accessibility, mobile responsiveness, and user interactions across multiple browsers and devices.

---

## Setup

### Install Dependencies

```bash
npm install
```

This will install Playwright and all required test dependencies.

### Install Browsers (First Time Only)

```bash
npx playwright install
```

This downloads Chromium, Firefox, and WebKit browsers for testing.

---

## Running Tests

### Run All Tests (Headless)

```bash
npm test
```

Runs all tests in headless mode across all configured browsers.

### Run Tests with UI

```bash
npm run test:ui
```

Opens the Playwright UI for interactive test running and debugging.

### Run Tests in Headed Mode

```bash
npm run test:headed
```

Shows browser windows during test execution (useful for watching tests run).

### Debug Tests

```bash
npm run test:debug
```

Opens Playwright Inspector for step-by-step debugging.

### View Test Report

```bash
npm run test:report
```

Opens the HTML test report from the last test run.

---

## Test Structure

### Test Files

All tests are located in the `tests/` directory:

```
tests/
├── navigation.spec.ts      # Desktop & mobile navigation tests
├── logos.spec.ts           # Partner logo link tests
├── pages.spec.ts           # Page loading & structure tests
├── accessibility.spec.ts   # A11y & WCAG compliance tests
```

### Test Coverage

#### **Navigation Tests** (`navigation.spec.ts`)
- ✅ Desktop navigation displays all items
- ✅ Desktop navigation links work correctly
- ✅ Active page highlighting
- ✅ Mobile hamburger menu button visibility
- ✅ Mobile menu opens/closes correctly
- ✅ Mobile menu displays all navigation items
- ✅ Mobile menu navigation works
- ✅ Mobile menu is scrollable (overflow handling)
- ✅ Logo navigates to home page

#### **Logo Link Tests** (`logos.spec.ts`)
- ✅ Anmore Adventures logo links to home (homepage)
- ✅ Trails Coffee logo links to home (homepage)
- ✅ Anmore Adventures logo links to home (bike-train page)
- ✅ Trails Coffee logo links to home (bike-train page)
- ✅ Logo hover effects work
- ✅ Main navigation brand logo links to home
- ✅ Brand logo visible on mobile

#### **Page Loading Tests** (`pages.spec.ts`)
- ✅ All pages load without HTTP errors (200 OK)
- ✅ All pages have correct titles
- ✅ No console errors on any page
- ✅ Pages have correct structure (hero, footer, nav)
- ✅ Responsive design works on mobile, tablet, desktop
- ✅ No horizontal scrolling
- ✅ Internal links are valid
- ✅ External links have proper attributes (target, rel)

#### **Accessibility Tests** (`accessibility.spec.ts`)
- ✅ Mobile menu button has aria-label
- ✅ Navigation is keyboard accessible
- ✅ All images have alt text
- ✅ Form inputs have labels
- ✅ Required fields are marked
- ✅ Semantic HTML (nav, footer landmarks)
- ✅ Proper heading hierarchy
- ✅ Buttons have accessible names
- ✅ Sufficient color contrast
- ✅ Visible focus indicators
- ✅ SVG icons don't interfere with screen readers
- ✅ Touch targets are large enough (44x44px minimum)

---

## Test Configuration

### Browsers Tested

- **Desktop:**
  - Chromium (Chrome/Edge)
  - Firefox
  - WebKit (Safari)

- **Mobile:**
  - Mobile Chrome (Pixel 5)
  - Mobile Safari (iPhone 12)

### Viewports Tested

- **Mobile:** 375x667 (iPhone SE)
- **Tablet:** 768x1024
- **Desktop:** 1280x720

---

## Continuous Integration

Tests can be run in CI/CD pipelines:

```bash
# In GitHub Actions or similar
npm install
npx playwright install --with-deps
npm test
```

Configuration in `playwright.config.ts` automatically:
- Runs tests in parallel on CI
- Retries failed tests (2 retries on CI)
- Generates HTML reports
- Takes screenshots on failure

---

## Writing New Tests

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test('should do something', async ({ page }) => {
    await page.goto('/');
    
    const element = page.locator('selector');
    await expect(element).toBeVisible();
  });
});
```

### Best Practices

1. **Use semantic selectors:** Prefer `role`, `text`, `aria-label` over CSS selectors
2. **Wait for visibility:** Use `await expect(element).toBeVisible()`
3. **Group related tests:** Use `test.describe()` blocks
4. **Test user flows:** Simulate real user interactions
5. **Check multiple viewports:** Test responsive behavior
6. **Verify accessibility:** Include a11y checks in new features

---

## Known Issues & Future Enhancements

### Implemented ✅
- Mobile menu scrolling
- Partner logo links to home
- All navigation items accessible
- Comprehensive test coverage

### Recommended Future Enhancements
- Add `aria-expanded` to mobile menu button
- Implement skip navigation link
- Add focus trap in mobile menu
- Keyboard shortcut to close menu (ESC key)
- Animate mobile menu open/close

---

## Troubleshooting

### Tests Fail Locally

1. **Ensure dev server is running:**
   ```bash
   npm run dev
   ```

2. **Check browser installation:**
   ```bash
   npx playwright install
   ```

3. **Clear Playwright cache:**
   ```bash
   npx playwright install --force
   ```

### Flaky Tests

- Increase timeout in `playwright.config.ts`
- Add explicit waits: `await page.waitForLoadState('networkidle')`
- Use `test.retry()` for specific flaky tests

### Screenshots on Failure

Failed test screenshots are saved to `test-results/` directory.

---

## Coverage Report

Current test coverage:

- **Pages:** 8/8 (100%)
- **Navigation Links:** 8/8 (100%)
- **Responsive Viewports:** 3/3 (100%)
- **Browsers:** 5/5 (100%)
- **Accessibility Checks:** 15+ automated checks

---

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Accessibility Testing Guide](https://playwright.dev/docs/accessibility-testing)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

---

## Contact

For questions about testing, see `UX_AUDIT_REPORT.md` or contact the development team.
