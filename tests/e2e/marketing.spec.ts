import { test, expect } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

test('marketing landing renders hero, features, pricing', async ({ page }) => {
  await page.goto(pathToFileURL(resolve('marketing/index.html')).href);
  await expect(page.getByRole('heading', { name: /Sleep sounds, beautifully simple/i })).toBeVisible();
  await expect(page.getByText(/Free to start/i)).toBeVisible();
  await expect(page.getByText(/\$39\.99/)).toBeVisible();
  await expect(page.getByText(/60\+ premium sounds/i)).toBeVisible();
});
