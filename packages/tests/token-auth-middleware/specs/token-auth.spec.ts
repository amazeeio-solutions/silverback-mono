import { expect, test } from '@playwright/test';

test('http authentication', async ({ page }) => {
  // Go to the home page
  await page.goto('/');
  await expect(page).toHaveTitle(/Token authentication test/);

  // Make sure the user is not authenticated.
  await expect(page.getByText('Login')).toBeVisible();

  // Go to the "restricted content" page.
  await page.getByText('Restricted content').click();

  // Fill the login form we are redirected to.
  await page.getByLabel('User-ID').fill('bob@amazeelabs.com');
  await page.getByText('Login').click();
  await expect(
    page.getByText('You will receive a message with instructions.'),
  ).toBeVisible();

  // Fetch the login link from `/restricted/___link`.
  const response = await fetch('http://localhost:8887/restricted/___link', {
    method: 'GET',
  });
  const link = await response.text();
  expect(link).toContain('/___auth');

  // Visit the login link to create a session.
  await page.goto(link);

  // Make sure the user is authenticated.
  await expect(page).toHaveTitle(/Restricted/);

  // Go back to the home page and verify the login status.
  await page.getByText('Home').click();
  await expect(
    page.getByText('Authenticated as: bob (bob@amazeelabs.com)'),
  ).toBeVisible();

  await page.getByText('Logout').click();

  // Make sure the user is not authenticated again
  await expect(page.getByText('Login')).toBeVisible();
});
