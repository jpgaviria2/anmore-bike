import { test, expect } from '@playwright/test';

/**
 * Navigation E2E Tests
 * Verifies all navigation links work correctly on desktop and mobile
 */

const navItems = [
  { label: 'Home', path: '/' },
  { label: 'Trail Building', path: '/trail-building' },
  { label: 'Pump Track', path: '/pump-track' },
  { label: 'Bike Train', path: '/bike-train' },
  { label: 'Bike Clinics', path: '/clinics' },
  { label: 'Afterschool Programs', path: '/afterschool' },
  { label: 'Leaderboard', path: '/leaderboard' },
  { label: '🔒 Admin', path: '/admin' },
];

test.describe('Desktop Navigation', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test('should display all navigation items on desktop', async ({ page }) => {
    await page.goto('/');
    
    // Desktop nav should be visible
    const desktopNav = page.locator('nav .hidden.lg\\:flex');
    await expect(desktopNav).toBeVisible();
    
    // Check all nav items are present
    for (const item of navItems) {
      const link = desktopNav.locator(`a:has-text("${item.label}")`);
      await expect(link).toBeVisible();
    }
  });

  test('should navigate to all pages from desktop menu', async ({ page }) => {
    await page.goto('/');
    
    for (const item of navItems) {
      // Click the nav link
      await page.click(`nav .hidden.lg\\:flex >> text=${item.label}`);
      
      // Verify URL changed
      await expect(page).toHaveURL(new RegExp(item.path + '$'));
      
      // Verify page loaded (check for Navigation component)
      await expect(page.locator('nav')).toBeVisible();
      
      // Go back to home for next iteration
      await page.goto('/');
    }
  });

  test('should highlight active page in navigation', async ({ page }) => {
    await page.goto('/bike-train');
    
    // Active link should have bold font
    const activeLink = page.locator('nav .hidden.lg\\:flex >> a:has-text("Bike Train")');
    await expect(activeLink).toHaveClass(/font-bold/);
  });
});

test.describe('Mobile Navigation', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

  test('should show hamburger menu button on mobile', async ({ page }) => {
    await page.goto('/');
    
    // Hamburger button should be visible
    const menuButton = page.locator('#mobile-menu-btn');
    await expect(menuButton).toBeVisible();
    
    // Desktop nav should be hidden
    const desktopNav = page.locator('nav .hidden.lg\\:flex');
    await expect(desktopNav).not.toBeVisible();
  });

  test('should open and close mobile menu', async ({ page }) => {
    await page.goto('/');
    
    const menuButton = page.locator('#mobile-menu-btn');
    const mobileMenu = page.locator('#mobile-menu');
    
    // Menu should be hidden initially
    await expect(mobileMenu).not.toBeVisible();
    
    // Open menu
    await menuButton.click();
    await expect(mobileMenu).toBeVisible();
    
    // Close icon should be visible
    const closeIcon = page.locator('#close-icon');
    await expect(closeIcon).toBeVisible();
    
    // Close menu
    await menuButton.click();
    await expect(mobileMenu).not.toBeVisible();
  });

  test('should display all navigation items in mobile menu', async ({ page }) => {
    await page.goto('/');
    
    // Open mobile menu
    await page.click('#mobile-menu-btn');
    const mobileMenu = page.locator('#mobile-menu');
    
    // Check all nav items are present
    for (const item of navItems) {
      const link = mobileMenu.locator(`a:has-text("${item.label}")`);
      await expect(link).toBeVisible();
    }
  });

  test('should navigate to all pages from mobile menu', async ({ page }) => {
    await page.goto('/');
    
    for (const item of navItems) {
      // Open mobile menu
      await page.click('#mobile-menu-btn');
      
      // Click the nav link
      await page.click(`#mobile-menu >> text=${item.label}`);
      
      // Verify URL changed
      await expect(page).toHaveURL(new RegExp(item.path + '$'));
      
      // Verify page loaded
      await expect(page.locator('nav')).toBeVisible();
      
      // Go back to home for next iteration
      await page.goto('/');
    }
  });

  test('mobile menu should be scrollable when content overflows', async ({ page }) => {
    await page.goto('/');
    
    // Open mobile menu
    await page.click('#mobile-menu-btn');
    const mobileMenu = page.locator('#mobile-menu');
    
    // Menu should have overflow-y-auto class
    await expect(mobileMenu).toHaveClass(/overflow-y-auto/);
    
    // Menu should have max-height constraint
    const menuBox = await mobileMenu.boundingBox();
    expect(menuBox).toBeTruthy();
    if (menuBox) {
      // Menu height should be less than viewport height
      expect(menuBox.height).toBeLessThan(667);
    }
  });
});

test.describe('Logo Navigation', () => {
  test('should navigate to home when clicking main logo', async ({ page }) => {
    await page.goto('/bike-train');
    
    // Click the main Anmore.bike logo/brand
    await page.click('nav a.text-xl');
    
    // Should navigate to home
    await expect(page).toHaveURL('/');
  });
});
