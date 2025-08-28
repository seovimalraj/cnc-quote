import { test, expect } from '@playwright/test';

test.describe('Widget Flow', () => {
  let widgetFrame: any;

  test.beforeEach(async ({ page }) => {
    // Load the test page that embeds the widget
    await page.goto('http://localhost:3001/test-widget.html');

    // Wait for and get the widget iframe
    widgetFrame = await page.frameLocator('#cnc-quote-widget');
  });

  test('should upload file and complete quote flow', async () => {
    // Click the upload button and handle file dialog
    const uploadButton = await widgetFrame.locator('button:has-text("Upload")');
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      uploadButton.click()
    ]);

    // Upload a test STL file
    await fileChooser.setFiles('./fixtures/test-part.stl');

    // Wait for upload and processing
    await widgetFrame.waitForSelector('text=File uploaded successfully');
    await widgetFrame.waitForSelector('text=Part Analysis');

    // Select material
    await widgetFrame.locator('select[name="material"]').selectOption('alu-6061');
    await widgetFrame.click('button:has-text("Next")');

    // Wait for DFM analysis
    await widgetFrame.waitForSelector('text=Manufacturability Score');

    // Configure features
    await widgetFrame.locator('select[name="surfaceFinish"]').selectOption('as-machined');
    await widgetFrame.locator('select[name="tolerance"]').selectOption('standard');
    await widgetFrame.locator('input[name="quantity"]').fill('10');
    await widgetFrame.click('button:has-text("Calculate")');

    // Wait for pricing
    await widgetFrame.waitForSelector('text=Price per unit');
    await widgetFrame.waitForSelector('text=Total price');

    // Fill customer info
    await widgetFrame.locator('input[name="customerName"]').fill('Test User');
    await widgetFrame.locator('input[name="customerEmail"]').fill('test@example.com');
    await widgetFrame.click('button:has-text("Create Quote")');

    // Wait for quote creation
    await widgetFrame.waitForSelector('text=Quote created successfully');

    // Verify quote summary 
    const quoteSummary = await widgetFrame.locator('.quote-summary').textContent();
    expect(quoteSummary).toContain('Material: Aluminum 6061');
    expect(quoteSummary).toContain('Quantity: 10');
  });

  test('should show DFM warnings', async () => {
    // Upload a file with known DFM issues
    const uploadButton = await widgetFrame.locator('button:has-text("Upload")');
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      uploadButton.click()
    ]);
    await fileChooser.setFiles('./fixtures/part-with-issues.stl');

    // Select material and trigger analysis
    await widgetFrame.locator('select[name="material"]').selectOption('alu-6061');
    await widgetFrame.click('button:has-text("Next")');

    // Verify DFM warnings are shown
    await widgetFrame.waitForSelector('text=Manufacturing Issues Found');
    const dfmWarnings = await widgetFrame.locator('.dfm-warnings').textContent();
    expect(dfmWarnings).toContain('Thin walls detected');
  });

  test('should enforce minimum quantity', async () => {
    // Complete upload and material selection
    const uploadButton = await widgetFrame.locator('button:has-text("Upload")');
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      uploadButton.click()
    ]);
    await fileChooser.setFiles('./fixtures/test-part.stl');
    await widgetFrame.locator('select[name="material"]').selectOption('alu-6061');
    await widgetFrame.click('button:has-text("Next")');

    // Try setting invalid quantity
    await widgetFrame.locator('input[name="quantity"]').fill('0');
    await widgetFrame.click('button:has-text("Calculate")');

    // Verify error message
    await widgetFrame.waitForSelector('text=Minimum quantity is 1');
  });
});
