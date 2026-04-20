/**
 * e2e-tests.spec.js
 *
 * END-TO-END TESTS - Automated testing for P2P Video Chat Application
 *
 * Tests the refactored application to ensure all functionality works correctly
 * after separating styles and utilities into separate files.
 */

import { test, expect } from '@playwright/test';

const FRONTEND_URL = 'https://localhost:3002';
const BACKEND_URL = 'wss://localhost:3001';

test.describe('P2P Video Chat Application - Refactored Code Tests', () => {

  test.beforeAll(async () => {
    // Ensure servers are running before tests
    console.log('Testing refactored P2P Video Chat application...');
  });

  test('1. Application loads successfully', async ({ page }) => {
    // Navigate to the application
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle' });

    // Check page title and basic elements
    await expect(page).toHaveTitle(''); // Title is commented out in Head

    // Verify main container exists
    const mainContainer = page.locator('main');
    await expect(mainContainer).toBeVisible();

    console.log('✅ Page loads successfully');
  });

  test('2. Header section renders correctly', async ({ page }) => {
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle' });

    // Check header elements (step 2 in rendering sequence)
    const header = page.locator('header');
    await expect(header).toBeVisible();

    const title = header.locator('h1');
    await expect(title).toContainText('🎥 P2P Video Chat');

    const subtitle = header.locator('p');
    await expect(subtitle).toContainText('WebRTC Peer-to-Peer Communication');

    console.log('✅ Header section renders correctly');
  });

  test('3. Status indicator shows initialization', async ({ page }) => {
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle' });

    // Check status indicator (step 4 in rendering sequence)
    const statusDiv = page.locator('.status');
    await expect(statusDiv).toBeVisible();

    // Should show "Initializing..." initially
    await expect(statusDiv).toContainText('Initializing...');

    console.log('✅ Status indicator works');
  });

  test('4. Registration form appears when not connected', async ({ page }) => {
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle' });

    // Check registration form (step 5 in rendering sequence)
    const registerSection = page.locator('section').filter({ hasText: '📝 Register' });
    await expect(registerSection).toBeVisible();

    const input = registerSection.locator('input[placeholder="Enter your name"]');
    await expect(input).toBeVisible();

    const button = registerSection.locator('button', { hasText: 'Register' });
    await expect(button).toBeVisible();

    console.log('✅ Registration form renders correctly');
  });

  test('5. Footer with instructions is present', async ({ page }) => {
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle' });

    // Check footer (step 7 in rendering sequence)
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();

    const instructions = footer.locator('h3', { hasText: '📚 How it works:' });
    await expect(instructions).toBeVisible();

    const steps = footer.locator('ol li');
    await expect(steps).toHaveCount(6); // Should have 6 steps

    console.log('✅ Footer with instructions renders correctly');
  });

  test('6. No JavaScript errors in console', async ({ page }) => {
    const errors = [];

    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Listen for page errors
    page.on('pageerror', error => {
      errors.push(error.message);
    });

    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle' });

    // Wait a bit for any async errors
    await page.waitForTimeout(3000);

    // Check that no critical errors occurred
    const criticalErrors = errors.filter(error =>
      !error.includes('Warning:') &&
      !error.includes('MODULE_TYPELESS_PACKAGE_JSON') &&
      !error.includes('downloadable font')
    );

    expect(criticalErrors).toHaveLength(0);

    console.log('✅ No critical JavaScript errors detected');
  });

  test('7. Styles are properly loaded from separate file', async ({ page }) => {
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle' });

    // Check that styles from styles.js are applied
    const header = page.locator('header');
    const headerBgColor = await header.evaluate(el => getComputedStyle(el).backgroundColor);
    expect(headerBgColor).toBe('rgb(33, 150, 243)'); // #2196F3

    const mainContainer = page.locator('main');
    const containerBgColor = await mainContainer.evaluate(el => getComputedStyle(el).backgroundColor);
    expect(containerBgColor).toBe('rgb(245, 245, 245)'); // #f5f5f5

    console.log('✅ Styles from separate file are properly applied');
  });

  test('8. Registration functionality works', async ({ page }) => {
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle' });

    // Wait for initialization
    await page.waitForTimeout(2000);

    // Fill registration form
    const input = page.locator('input[placeholder="Enter your name"]');
    await input.fill('TestUser');

    const registerButton = page.locator('button', { hasText: 'Register' });
    await registerButton.click();

    // Check status changes
    const statusDiv = page.locator('.status');
    await expect(statusDiv).toContainText('Registering...');

    // Wait for registration to complete (may take a moment)
    await page.waitForTimeout(3000);

    // Status should change to "Registered! Waiting for peers..."
    await expect(statusDiv).toContainText('Registered!');

    console.log('✅ Registration functionality works');
  });

  test('9. Peer list appears after registration', async ({ page }) => {
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle' });

    // Register first
    const input = page.locator('input[placeholder="Enter your name"]');
    await input.fill('TestUser2');
    const registerButton = page.locator('button', { hasText: 'Register' });
    await registerButton.click();

    // Wait for registration
    await page.waitForTimeout(3000);

    // Check peer list section appears
    const peerSection = page.locator('section').filter({ hasText: '👥 Available Peers' });
    await expect(peerSection).toBeVisible();

    const waitingText = peerSection.locator('p').filter({ hasText: '⏳ Waiting for other peers...' });
    await expect(waitingText).toBeVisible();

    console.log('✅ Peer list section appears after registration');
  });

  test('10. Video elements are present in DOM', async ({ page }) => {
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle' });

    // Register first
    const input = page.locator('input[placeholder="Enter your name"]');
    await input.fill('TestUser3');
    const registerButton = page.locator('button', { hasText: 'Register' });
    await registerButton.click();

    // Wait for registration
    await page.waitForTimeout(3000);

    // Check video elements exist (they should be in the video section)
    const localVideo = page.locator('#localVideo');
    const remoteVideo = page.locator('#remoteVideo');

    // Videos should exist in DOM even if not visible yet
    await expect(localVideo).toBeAttached();
    await expect(remoteVideo).toBeAttached();

    console.log('✅ Video elements are present in DOM');
  });

});