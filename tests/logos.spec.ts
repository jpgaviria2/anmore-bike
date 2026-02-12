import { test, expect } from '@playwright/test';

/**
 * Logo Link E2E Tests
 * Verifies that partner logos (Anmore Adventures & Trails Coffee) link to home
 */

test.describe('Partner Logo Links - Homepage', () => {
  test('should navigate home when clicking Anmore Adventures logo', async ({ page }) => {
    await page.goto('/');
    
    // Find the Anmore Adventures logo link in the bike train featured section
    const anmoreAdventuresLink = page.locator('a:has(img[alt="Anmore Adventures"])').first();
    
    // Verify link exists
    await expect(anmoreAdventuresLink).toBeVisible();
    
    // Navigate away first
    await page.goto('/bike-train');
    
    // Go back to home
    await page.goto('/');
    
    // Click the logo
    await anmoreAdventuresLink.click();
    
    // Should be on home page
    await expect(page).toHaveURL('/');
  });

  test('should navigate home when clicking Trails Coffee logo', async ({ page }) => {
    await page.goto('/');
    
    // Find the Trails Coffee logo link in the bike train featured section
    const trailsCoffeeLink = page.locator('a:has(img[alt="Trails Coffee"])').first();
    
    // Verify link exists
    await expect(trailsCoffeeLink).toBeVisible();
    
    // Navigate away first
    await page.goto('/clinics');
    
    // Go back to home
    await page.goto('/');
    
    // Click the logo
    await trailsCoffeeLink.click();
    
    // Should be on home page
    await expect(page).toHaveURL('/');
  });

  test('should have hover effect on logo links', async ({ page }) => {
    await page.goto('/');
    
    const anmoreAdventuresLink = page.locator('a:has(img[alt="Anmore Adventures"])').first();
    
    // Verify hover class is present
    await expect(anmoreAdventuresLink).toHaveClass(/hover:opacity-80/);
  });
});

test.describe('Partner Logo Links - Bike Train Page', () => {
  test('should navigate home when clicking Anmore Adventures logo on bike-train page', async ({ page }) => {
    await page.goto('/bike-train');
    
    // Find the Anmore Adventures logo in the "Brought to you by" section
    const anmoreAdventuresLink = page.locator('a:has(img[alt="Anmore Adventures"])').first();
    
    // Verify link exists
    await expect(anmoreAdventuresLink).toBeVisible();
    
    // Click the logo
    await anmoreAdventuresLink.click();
    
    // Should navigate to home page
    await expect(page).toHaveURL('/');
  });

  test('should navigate home when clicking Trails Coffee logo on bike-train page', async ({ page }) => {
    await page.goto('/bike-train');
    
    // Find the Trails Coffee logo in the "Brought to you by" section
    const trailsCoffeeLink = page.locator('a:has(img[alt="Trails Coffee"])').first();
    
    // Verify link exists
    await expect(trailsCoffeeLink).toBeVisible();
    
    // Click the logo
    await trailsCoffeeLink.click();
    
    // Should navigate to home page
    await expect(page).toHaveURL('/');
  });
});

test.describe('Main Navigation Logo', () => {
  test('should navigate to home when clicking Anmore.bike brand in header', async ({ page }) => {
    await page.goto('/pump-track');
    
    // Find the main brand link
    const brandLink = page.locator('nav a.text-xl:has-text("Anmore.bike")');
    
    // Click it
    await brandLink.click();
    
    // Should navigate to home
    await expect(page).toHaveURL('/');
  });

  test('brand logo should be visible on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // The SVG icon should be visible
    const logoSvg = page.locator('nav a.text-xl svg');
    await expect(logoSvg).toBeVisible();
  });
});
