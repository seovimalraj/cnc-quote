import { test, expect } from '@playwright/test';

test.describe('Instant Quote Landing (unauthenticated)', () => {
  test('shows landing hero and CTA links', async ({ page }) => {
    await page.goto('/instant-quote');
    await expect(page.getByRole('heading', { name: /Get Instant Quotes/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Get Started/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Sign In/i })).toBeVisible();
  });
});
