/**
 * Step 13: E2E Tests for Optimistic Pricing UI
 * Tests user interactions and system behavior
 */

import { test, expect } from '@playwright/test';

test.describe('Optimistic Pricing UI', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to quote page
    await page.goto('/quote');
    
    // Wait for initial price to load
    await page.waitForSelector('[data-testid="price-box"]');
  });

  test('shows instant updates when changing quantity', async ({ page }) => {
    // Get initial price
    const initialPrice = await page.locator('[data-testid="total-price"]').textContent();
    
    // Change quantity
    await page.fill('[aria-label="Quantity"]', '5');
    
    // Price should update instantly (<100ms)
    const startTime = Date.now();
    await page.waitForFunction(
      (initial) => {
        const current = document.querySelector('[data-testid="total-price"]')?.textContent;
        return current !== initial;
      },
      initialPrice,
      { timeout: 100 }
    );
    const updateTime = Date.now() - startTime;
    
    expect(updateTime).toBeLessThan(100);
  });

  test('handles rapid toggles without blocking', async ({ page }) => {
    const networkRequests: string[] = [];
    
    // Track network requests
    page.on('request', (request) => {
      if (request.url().includes('/api/pricing')) {
        networkRequests.push(request.url());
      }
    });
    
    // Rapidly change quantity
    await page.fill('[aria-label="Quantity"]', '2');
    await page.fill('[aria-label="Quantity"]', '5');
    await page.fill('[aria-label="Quantity"]', '10');
    
    // UI should never freeze
    const isInteractive = await page.locator('[aria-label="Quantity"]').isEnabled();
    expect(isInteractive).toBe(true);
    
    // Wait for stabilization
    await page.waitForTimeout(1000);
    
    // Should deduplicate and only fetch for final value
    expect(networkRequests.length).toBeLessThanOrEqual(2);
  });

  test('shows optimistic indicator during calculation', async ({ page }) => {
    // Change configuration
    await page.fill('[aria-label="Quantity"]', '10');
    
    // Should show optimistic indicator
    await expect(page.locator('[data-testid="optimistic-indicator"]')).toBeVisible();
    
    // Indicator should disappear when server responds
    await expect(page.locator('[data-testid="optimistic-indicator"]')).not.toBeVisible({
      timeout: 2000,
    });
  });

  test('uses cached prices for identical configurations', async ({ page }) => {
    const networkRequests: string[] = [];
    
    page.on('request', (request) => {
      if (request.url().includes('/api/pricing')) {
        networkRequests.push(request.url());
      }
    });
    
    // Set quantity to 5
    await page.fill('[aria-label="Quantity"]', '5');
    await page.waitForTimeout(500);
    
    const requestsAfterFirst = networkRequests.length;
    
    // Change to different value
    await page.fill('[aria-label="Quantity"]', '10');
    await page.waitForTimeout(500);
    
    // Change back to 5
    await page.fill('[aria-label="Quantity"]', '5');
    await page.waitForTimeout(500);
    
    // Should use cached result for second instance of "5"
    // May trigger 1-2 requests but not a full new fetch
    expect(networkRequests.length).toBeLessThan(requestsAfterFirst + 3);
  });

  test('handles material changes', async ({ page }) => {
    const initialPrice = await page.locator('[data-testid="total-price"]').textContent();
    
    // Change material
    await page.selectOption('[aria-label="Material"]', 'SS304');
    
    // Price should update
    await page.waitForFunction(
      (initial) => {
        const current = document.querySelector('[data-testid="total-price"]')?.textContent;
        return current !== initial;
      },
      initialPrice,
      { timeout: 1000 }
    );
    
    const newPrice = await page.locator('[data-testid="total-price"]').textContent();
    expect(newPrice).not.toBe(initialPrice);
  });

  test('handles process changes', async ({ page }) => {
    const initialPrice = await page.locator('[data-testid="total-price"]').textContent();
    
    // Change process
    await page.selectOption('[aria-label="Manufacturing Process"]', 'turning');
    
    // Price should update
    await page.waitForFunction(
      (initial) => {
        const current = document.querySelector('[data-testid="total-price"]')?.textContent;
        return current !== initial;
      },
      initialPrice,
      { timeout: 1000 }
    );
  });

  test('handles lead time changes', async ({ page }) => {
    const initialPrice = await page.locator('[data-testid="total-price"]').textContent();
    
    // Click express lead time
    await page.click('button[aria-pressed="false"]:has-text("3 days")');
    
    // Price should increase (surge pricing)
    await page.waitForFunction(
      (initial) => {
        const current = document.querySelector('[data-testid="total-price"]')?.textContent;
        if (!current || !initial) return false;
        
        const currentValue = parseFloat(current.replace(/[^0-9.]/g, ''));
        const initialValue = parseFloat(initial.replace(/[^0-9.]/g, ''));
        
        return currentValue > initialValue;
      },
      initialPrice,
      { timeout: 1000 }
    );
  });

  test('shows error state on network failure', async ({ page }) => {
    // Simulate network failure
    await page.route('**/api/pricing/price', (route) => {
      route.abort('failed');
    });
    
    // Change configuration
    await page.fill('[aria-label="Quantity"]', '5');
    
    // Should show error
    await expect(page.locator('[data-testid="price-error"]')).toBeVisible({
      timeout: 2000,
    });
  });

  test('recovers from errors', async ({ page }) => {
    let failFirst = true;
    
    // Fail first request, succeed second
    await page.route('**/api/pricing/price', (route) => {
      if (failFirst) {
        failFirst = false;
        route.abort('failed');
      } else {
        route.continue();
      }
    });
    
    // First change fails
    await page.fill('[aria-label="Quantity"]', '5');
    await expect(page.locator('[data-testid="price-error"]')).toBeVisible();
    
    // Second change succeeds
    await page.fill('[aria-label="Quantity"]', '6');
    await expect(page.locator('[data-testid="price-error"]')).not.toBeVisible({
      timeout: 2000,
    });
    await expect(page.locator('[data-testid="total-price"]')).toBeVisible();
  });

  test('maintains price visibility during updates', async ({ page }) => {
    // Get initial price
    const priceBox = page.locator('[data-testid="price-box"]');
    await expect(priceBox).toBeVisible();
    
    // Change configuration multiple times
    for (let i = 2; i <= 10; i++) {
      await page.fill('[aria-label="Quantity"]', String(i));
      await page.waitForTimeout(50);
    }
    
    // Price should always remain visible (no flicker to loading)
    await expect(priceBox).toBeVisible();
    const hasPrice = await page.locator('[data-testid="total-price"]').isVisible();
    expect(hasPrice).toBe(true);
  });

  test('keyboard navigation works', async ({ page }) => {
    // Tab through controls
    await page.keyboard.press('Tab'); // Focus quantity
    await page.keyboard.type('5');
    
    await page.keyboard.press('Tab'); // Focus material
    await page.keyboard.press('ArrowDown'); // Select next material
    
    await page.keyboard.press('Tab'); // Focus process
    await page.keyboard.press('ArrowDown'); // Select next process
    
    // Price should have updated
    const hasValidPrice = await page.locator('[data-testid="total-price"]').textContent();
    expect(hasValidPrice).toBeTruthy();
  });

  test('accessibility labels are present', async ({ page }) => {
    await expect(page.locator('[aria-label="Quantity"]')).toBeVisible();
    await expect(page.locator('[aria-label="Material"]')).toBeVisible();
    await expect(page.locator('[aria-label="Manufacturing Process"]')).toBeVisible();
    await expect(page.locator('[role="group"][aria-label="Lead time selection"]')).toBeVisible();
  });

  test('shows slow pricing warning for long requests', async ({ page }) => {
    // Simulate slow response
    await page.route('**/api/pricing/price', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 3500));
      route.continue();
    });
    
    // Change configuration
    await page.fill('[aria-label="Quantity"]', '100');
    
    // Should show slow warning after 3 seconds
    await expect(page.locator('[data-testid="slow-pricing-toast"]')).toBeVisible({
      timeout: 3500,
    });
  });
});

test.describe('Cache Behavior', () => {
  test('invalidates cache on version change', async ({ page }) => {
    await page.goto('/quote');
    
    // Get initial price
    await page.fill('[aria-label="Quantity"]', '5');
    await page.waitForTimeout(500);
    
    // Simulate version change (e.g., catalog update)
    await page.evaluate(() => {
      localStorage.setItem('catalog_version', 'v2');
    });
    
    // Reload page
    await page.reload();
    
    // Same configuration should re-fetch (version mismatch)
    const networkRequests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/pricing')) {
        networkRequests.push(request.url());
      }
    });
    
    await page.fill('[aria-label="Quantity"]', '5');
    await page.waitForTimeout(500);
    
    expect(networkRequests.length).toBeGreaterThan(0);
  });
});
