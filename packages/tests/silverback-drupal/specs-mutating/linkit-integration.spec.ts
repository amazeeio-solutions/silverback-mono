import {
  drupal,
  drupalLogin,
  resetDrupalState,
} from '@amazeelabs/silverback-playwright';
import { expect, test } from '@playwright/test';
import { platform } from 'os';

test.beforeAll(async () => {
  await resetDrupalState();
});
test.afterAll(async () => {
  await resetDrupalState();
});

test('linkit content sorting', async ({ page }) => {
  await drupalLogin(page);

  const target = 'target page';

  for (const title of [
    `something else something else ${target}`,
    `${target} something else something else`,
    `something else ${target} something else`,
  ]) {
    await page.goto(`${drupal.baseUrl}/en/node/add/page`);
    await page.getByLabel('Title', { exact: true }).fill(title);
    await page.getByRole('button', { name: 'Save' }).click();
  }

  await page.goto(`${drupal.baseUrl}/en/node/add/gutenberg_page`);
  await page.click('[data-type="core/paragraph"]');
  await page.type('[data-type="core/paragraph"]', 'Text');
  await page.press(
    '[data-type="core/paragraph"]',
    platform() === 'darwin' ? 'Meta+a' : 'Control+a',
  );
  await page.click('[aria-label="Link"]');
  await page.getByPlaceholder('Search or type url').fill(target);

  await page.waitForSelector('.block-editor-link-control__search-item-title');
  expect(
    await page
      .locator('.block-editor-link-control__search-item-title')
      .allInnerTexts(),
  ).toStrictEqual(
    // The close the search string is to the beginning of the title, the
    // higher the score.
    [
      `${target} something else something else`,
      `something else ${target} something else`,
      `something else something else ${target}`,
    ],
  );
});

test('linkit media sorting', async ({ page }) => {
  await drupalLogin(page);

  const target = 'target media';

  for (const title of [
    `something else something else ${target}`,
    `${target} something else something else`,
    `something else ${target} something else`,
  ]) {
    await page.goto(`${drupal.baseUrl}/en/media/add/remote_video`);
    await page.getByLabel('Name', { exact: true }).fill(title);
    await page
      .getByLabel('Remote video URL', { exact: true })
      .fill('https://www.youtube.com/watch?v=-wtAzYbklE0');
    await page.getByRole('button', { name: 'Save' }).click();
  }

  await page.goto(`${drupal.baseUrl}/en/node/add/gutenberg_page`);
  await page.click('[data-type="core/paragraph"]');
  await page.type('[data-type="core/paragraph"]', 'Text');
  await page.press(
    '[data-type="core/paragraph"]',
    platform() === 'darwin' ? 'Meta+a' : 'Control+a',
  );
  await page.click('[aria-label="Link"]');
  await page.getByPlaceholder('Search or type url').fill(target);

  await page.waitForSelector('.block-editor-link-control__search-item-title');
  expect(
    await page
      .locator('.block-editor-link-control__search-item-title')
      .allInnerTexts(),
  ).toStrictEqual(
    // The close the search string is to the beginning of the title, the
    // higher the score.
    [
      `${target} something else something else`,
      `something else ${target} something else`,
      `something else something else ${target}`,
    ],
  );
});

test('linkit bundles', async ({ page }) => {
  await drupalLogin(page);

  const target = 'FooBar';

  await page.goto(`${drupal.baseUrl}/en/node/add/page`);
  await page.getByLabel('Title', { exact: true }).fill(`${target} page`);
  await page.getByRole('button', { name: 'Save' }).click();

  await page.goto(`${drupal.baseUrl}/en/node/add/article`);
  await page.getByLabel('Title', { exact: true }).fill(`${target} article`);
  await page.getByRole('button', { name: 'Save' }).click();

  await page.goto(`${drupal.baseUrl}/en/media/add/remote_video`);
  await page.getByLabel('Name', { exact: true }).fill(`${target} video`);
  await page
    .getByLabel('Remote video URL', { exact: true })
    .fill('https://www.youtube.com/watch?v=-wtAzYbklE0');
  await page.getByRole('button', { name: 'Save' }).click();

  await page.goto(`${drupal.baseUrl}/en/node/add/gutenberg_page`);
  await page.click('[data-type="core/paragraph"]');
  await page.type('[data-type="core/paragraph"]', 'Text');
  await page.press(
    '[data-type="core/paragraph"]',
    platform() === 'darwin' ? 'Meta+a' : 'Control+a',
  );
  await page.click('[aria-label="Link"]');
  await page.getByPlaceholder('Search or type url').fill(target);

  await expect(
    page.locator('.block-editor-link-control__search-item-type', {
      hasText: 'Content: Article',
    }),
  ).toBeVisible();
  await expect(
    page.locator('.block-editor-link-control__search-item-type', {
      hasText: 'Content: Page',
    }),
  ).toBeVisible();
  await expect(
    page.locator('.block-editor-link-control__search-item-type', {
      hasText: 'Media: Remote video',
    }),
  ).toBeVisible();
});

test('linkit translations', async ({ page }) => {
  await drupalLogin(page);

  await page.goto(`${drupal.baseUrl}/en/node/add/page`);
  await page.getByLabel('Title', { exact: true }).fill(`English page`);
  await page.getByRole('button', { name: 'Save' }).click();
  await page.getByRole('link', { name: 'Translate' }).click();
  await page.click(':text-is("Add"):right-of(:text-is("German"))');
  await page
    .getByLabel('Titel', { exact: true })
    .fill(`German Translation page`);
  await page.getByRole('button', { name: 'Speichern' }).click();

  await page.goto(`${drupal.baseUrl}/en/node/add/gutenberg_page`);
  await page.click('[data-type="core/paragraph"]');
  await page.type('[data-type="core/paragraph"]', 'Text');
  await page.press(
    '[data-type="core/paragraph"]',
    platform() === 'darwin' ? 'Meta+a' : 'Control+a',
  );
  await page.click('[aria-label="Link"]');
  await page.getByPlaceholder('Search or type url').fill('German Translation');

  await expect(
    page.locator('.block-editor-link-control__search-item-title'),
  ).toHaveText('English page (German Translation page)');

  await page.goto(`${drupal.baseUrl}/de/node/add/gutenberg_page`);
  await page.click('[data-type="core/paragraph"]');
  await page.type('[data-type="core/paragraph"]', 'Text');
  await page.press(
    '[data-type="core/paragraph"]',
    platform() === 'darwin' ? 'Meta+a' : 'Control+a',
  );
  await page.click('[aria-label="Link"]');
  await page.getByPlaceholder('Search or type url').fill('German Translation');

  await expect(
    page.locator('.block-editor-link-control__search-item-title'),
  ).toHaveText('German Translation page');
  await expect(
    page.locator('.block-editor-link-control__search-item-title'),
  ).not.toHaveText('English page');
});

test('test url autocomplete keyboard selection', async ({ page }) => {
  await drupalLogin(page);
  await page.goto(`${drupal.baseUrl}/en/node/add/gutenberg_page`);

  await page.click('[data-type="core/paragraph"]');
  await page.click('button[aria-label="Toggle block inserter"]');
  await page.click(':text-is("Teaser")');
  await page.fill('[placeholder="Search or type url"]', 'page');
  await page.waitForSelector('.block-editor-link-control__search-item');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  //await page.waitForSelector('.block-editor-link-control__search-item-title');
  await expect(
    page.locator('.block-editor-link-control__search-item-title'),
  ).toHaveAttribute('href', /^\//);
});
