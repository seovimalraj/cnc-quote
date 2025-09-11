import { test, expect } from '@playwright/test';

test.describe('Instant Quote Page', () => {
  test('should load instant quote page without errors', async ({ page }) => {
    // Navigate to instant quote page
    await page.goto('/instant-quote');

    // Check if page loads without errors
    await expect(page).toHaveURL(/instant-quote/);

    // Check for any error messages
    const errorMessages = page.locator('.text-red-500, .text-red-600, .bg-red-50');
    await expect(errorMessages).toHaveCount(0);

    // Check if main elements are present
    await expect(page.locator('h1').filter({ hasText: /Design for Manufacturability|Upload|CAD/ })).toBeVisible();
  });

  test('should handle file upload without errors', async ({ page }) => {
    await page.goto('/instant-quote');

    // Check if file upload area is present
    const uploadArea = page.locator('[data-test="file-upload"], .dropzone, [type="file"]');
    await expect(uploadArea.first()).toBeVisible();

    // Try to upload a test file (if available)
    const fileInput = page.locator('input[type="file"]');
    if (await fileInput.count() > 0) {
      // Create a simple test file
      await page.setInputFiles('input[type="file"]', {
        name: 'test.stl',
        mimeType: 'model/stl',
        buffer: Buffer.from('test file content')
      });

      // Check for any error messages after upload attempt
      const errorMessages = page.locator('.text-red-500, .text-red-600');
      await expect(errorMessages).toHaveCount(0);
    }
  });

  test('should navigate through quote flow', async ({ page }) => {
    await page.goto('/instant-quote');

    // Check if navigation elements are present
    const navElements = page.locator('a, button').filter({ hasText: /quote|upload|get quote/i });
    await expect(navElements.first()).toBeVisible();

    // Check for any broken links or navigation issues
    const links = page.locator('a[href]');
    const linkCount = await links.count();

    for (let i = 0; i < Math.min(linkCount, 5); i++) {
      const href = await links.nth(i).getAttribute('href');
      if (href && !href.startsWith('http') && !href.startsWith('#')) {
        // Test internal navigation
        const response = await page.request.get(page.url() + href);
        expect(response.status()).toBeLessThan(400);
      }
    }
  });

  test('should display pricing information correctly', async ({ page }) => {
    await page.goto('/instant-quote');

    // Check if pricing-related elements are present and don't show errors
    const priceElements = page.locator('[data-test*="price"], .price, [class*="price"]');
    if (await priceElements.count() > 0) {
      // If pricing elements exist, they shouldn't show undefined or error values
      for (const element of await priceElements.all()) {
        const text = await element.textContent();
        expect(text).not.toContain('undefined');
        expect(text).not.toContain('NaN');
      }
    }
  });
});
