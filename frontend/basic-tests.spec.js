/**
 * basic-tests.spec.js
 *
 * BASIC AUTOMATED TESTS - Simple tests for refactored application
 *
 * Tests the core functionality without requiring full server setup
 */

import { test, expect } from '@playwright/test';

test.describe('P2P Video Chat - Basic Functionality Tests', () => {

  test('Page loads and renders correctly', async ({ page }) => {
    // Mock the socket connection to avoid needing the server
    await page.addInitScript(() => {
      window.WebSocket = class MockWebSocket {
        constructor() { this.readyState = 1; }
        send() {}
        close() {}
      };
    });

    await page.goto('https://localhost:3002', { waitUntil: 'networkidle' });

    // Check main elements exist
    await expect(page.locator('h1')).toContainText('🎥 P2P Video Chat');
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('footer')).toBeVisible();
  });

  test('Styles are applied correctly', async ({ page }) => {
    await page.addInitScript(() => {
      window.WebSocket = class MockWebSocket {
        constructor() { this.readyState = 1; }
        send() {}
        close() {}
      };
    });

    await page.goto('https://localhost:3002', { waitUntil: 'networkidle' });

    // Check specific styles from styles.js
    const header = page.locator('header');
    const bgColor = await header.evaluate(el => getComputedStyle(el).backgroundColor);
    expect(bgColor).toBe('rgb(33, 150, 243)'); // #2196F3
  });

  test('Registration form elements exist', async ({ page }) => {
    await page.addInitScript(() => {
      window.WebSocket = class MockWebSocket {
        constructor() { this.readyState = 1; }
        send() {}
        close() {}
      };
    });

    await page.goto('https://localhost:3002', { waitUntil: 'networkidle' });

    // Check form elements
    const input = page.locator('input[placeholder="Enter your name"]');
    const button = page.locator('button', { hasText: 'Register' });

    await expect(input).toBeVisible();
    await expect(button).toBeVisible();
  });

  test('Footer instructions are present', async ({ page }) => {
    await page.addInitScript(() => {
      window.WebSocket = class MockWebSocket {
        constructor() { this.readyState = 1; }
        send() {}
        close() {}
      };
    });

    await page.goto('https://localhost:3002', { waitUntil: 'networkidle' });

    // Check footer content
    const footer = page.locator('footer');
    await expect(footer).toContainText('📚 How it works:');
    await expect(footer.locator('ol li')).toHaveCount(6);
  });

  test('No JavaScript errors occur', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.addInitScript(() => {
      window.WebSocket = class MockWebSocket {
        constructor() { this.readyState = 1; }
        send() {}
        close() {}
      };
    });

    await page.goto('https://localhost:3002', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Filter out non-critical errors
    const criticalErrors = errors.filter(error =>
      !error.includes('Warning:') &&
      !error.includes('MODULE_TYPELESS_PACKAGE_JSON') &&
      !error.includes('downloadable font')
    );

    expect(criticalErrors).toHaveLength(0);
  });

});