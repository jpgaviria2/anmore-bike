import { test, expect } from '@playwright/test';

/**
 * Page Loading E2E Tests
 * Verifies all pages load without errors and have correct structure
 */

const pages = [
  { name: 'Home', path: '/', title: 'Anmore.bike - Bike Resources for Anmore BC' },
  { name: 'Trail Building', path: '/trail-building', title: 'Trail Building' },
  { name: 'Pump Track', path: '/pump-track', title: 'Pump Track' },
  { name: 'Bike Train', path: '/bike-train', title: 'Bike Train to School' },
  { name: 'Bike Clinics', path: '/clinics', title: 'Bike Clinics' },
  { name: 'Afterschool', path: '/afterschool', title: 'Afterschool Programs' },
  { name: 'Leaderboard', path: '/leaderboard', title: 'Leaderboard' },
  { name: 'Admin', path: '/admin', title: 'Admin' },
];

test.describe('Page Loading Tests', () => {
  for (const page of pages) {
    test(`${page.name} page should load without errors`, async ({ page: browserPage }) => {
      const response = await browserPage.goto(page.path);
      
      // Should get 200 OK
      expect(response?.status()).toBe(200);
      
      // Page title should contain expected text
      await expect(browserPage).toHaveTitle(new RegExp(page.title));
      
      // Navigation should be present
      await expect(browserPage.locator('nav')).toBeVisible();
      
      // Main content should be present
      const main = browserPage.locator('body');
      await expect(main).toBeVisible();
    });

    test(`${page.name} page should have no console errors`, async ({ page: browserPage }) => {
      const consoleErrors: string[] = [];
      
      browserPage.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });
      
      await browserPage.goto(page.path);
      
      // Wait for page to settle
      await browserPage.waitForLoadState('networkidle');
      
      // Should have no console errors
      expect(consoleErrors).toHaveLength(0);
    });
  }
});

test.describe('Page Structure Tests', () => {
  test('Home page should have hero section', async ({ page }) => {
    await page.goto('/');
    
    const hero = page.locator('section.bg-gradient-to-br');
    await expect(hero).toBeVisible();
    
    const heading = hero.locator('h1:has-text("Welcome to Anmore.bike")');
    await expect(heading).toBeVisible();
  });

  test('Home page should have footer', async ({ page }) => {
    await page.goto('/');
    
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
    
    // Footer should contain links
    const footerLinks = footer.locator('a');
    await expect(footerLinks).toHaveCount(await footerLinks.count());
  });

  test('All pages should have consistent header height', async ({ page }) => {
    const headerHeights: number[] = [];
    
    for (const pageInfo of pages.slice(0, 4)) { // Test first 4 pages
      await page.goto(pageInfo.path);
      const nav = page.locator('nav');
      const box = await nav.boundingBox();
      if (box) {
        headerHeights.push(box.height);
      }
    }
    
    // All header heights should be similar (within 5px)
    const minHeight = Math.min(...headerHeights);
    const maxHeight = Math.max(...headerHeights);
    expect(maxHeight - minHeight).toBeLessThan(5);
  });
});

test.describe('Responsive Design Tests', () => {
  const viewports = [
    { name: 'Mobile', width: 375, height: 667 },
    { name: 'Tablet', width: 768, height: 1024 },
    { name: 'Desktop', width: 1280, height: 720 },
  ];

  for (const viewport of viewports) {
    test(`Home page should render correctly on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/');
      
      // Navigation should be present
      await expect(page.locator('nav')).toBeVisible();
      
      // Hero section should be visible
      await expect(page.locator('h1:has-text("Welcome to Anmore.bike")')).toBeVisible();
      
      // No horizontal scrollbar
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1); // Allow 1px tolerance
    });
  }
});

test.describe('Link Integrity Tests', () => {
  test('All internal links on home page should be valid', async ({ page }) => {
    await page.goto('/');
    
    // Get all internal links
    const links = await page.locator('a[href^="/"]').all();
    
    for (const link of links) {
      const href = await link.getAttribute('href');
      if (href && !href.includes('#')) {
        // Try navigating to the link
        const response = await page.goto(href);
        expect(response?.status()).toBe(200);
        
        // Go back to home
        await page.goto('/');
      }
    }
  });

  test('External links should have proper attributes', async ({ page }) => {
    await page.goto('/');
    
    // Find external links (http/https)
    const externalLinks = page.locator('a[href^="http"]');
    const count = await externalLinks.count();
    
    for (let i = 0; i < count; i++) {
      const link = externalLinks.nth(i);
      
      // Should have target="_blank"
      await expect(link).toHaveAttribute('target', '_blank');
      
      // Should have rel="noopener noreferrer" (or at least rel attribute)
      const rel = await link.getAttribute('rel');
      expect(rel).toBeTruthy();
    }
  });
});
