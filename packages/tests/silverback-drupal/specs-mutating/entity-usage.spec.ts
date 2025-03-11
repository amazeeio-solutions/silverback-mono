import {
  drupal,
  drupalLogin,
  resetDrupalState,
} from '@amazeelabs/silverback-playwright';
import { expect, test } from '@playwright/test';

test.beforeAll(async () => {
  await resetDrupalState();
});
test.afterAll(async () => {
  await resetDrupalState();
});

test('test gutenberg media entity usage', async ({ page }) => {
  await drupalLogin(page);
  await page.goto(`${drupal.baseUrl}/en/node/add/gutenberg_page`);

  // Create first a gutenberg page with a reference to the Mountain media.
  await page.click('[data-type="core/paragraph"]');
  await page.click('button[aria-label="Toggle block inserter"]');
  await page.click(
    'span.block-editor-block-types-list__item-title:text-is("Media")',
  );
  await page.click(
    'div.wp-block-drupalmedia-drupal-media-entity button:text-is("Media Library")',
  );
  await page.click(
    'form.media-library-views-form article.media-library-item__preview-wrapper img[alt="Mountain"]',
  );
  await page.click('div.ui-dialog-buttonset button:text-is("Insert")');
  // Wait until the image appears in the editor.
  await expect(
    await page.locator('figure.wp-block-drupalmedia-drupal-media-entity img'),
  ).toBeVisible();

  // Add a title and save the node.
  await page.click('[aria-label="Settings"]');
  await page.click(':text-is("Document")');
  await page.fill('label:text-is("Title")', 'Test entity usage');
  await page.click('input:text-is("Save")');

  // Go to the media with the name Mountain and check the Usage tag.
  await page.goto(`${drupal.baseUrl}/en/admin/content/media`);
  await page.click('td.views-field-name a:text-is("Mountain")');
  await page.click('ul.tabs--primary a.tabs__link:text-is("Usage")');

  await expect(page.locator('div.region-content tbody')).toContainText(
    'Test entity usage',
  );

  // Remove now the media entity from the node and check again.
  await page.goto(`${drupal.baseUrl}/en/admin/content`);
  await page.click('td.views-field-title a:text-is("Test entity usage")');
  await page.click('ul.tabs--primary a.tabs__link:text-is("Edit")');
  await page.click('img[alt="Mountain"]');
  await page.click('div.block-editor-block-settings-menu button');
  await page.click(
    'div.components-dropdown-menu__menu button span:text-is("Remove block")',
  );

  // Resave the node now.
  await page.click('[aria-label="Settings"]');
  await page.click(':text-is("Document")');
  await page.click('input:text-is("Save")');

  // And now check the Mountain media usage.
  await page.goto(`${drupal.baseUrl}/en/admin/content/media`);
  await page.click('td.views-field-name a:text-is("Mountain")');
  await page.click('ul.tabs--primary a.tabs__link:text-is("Usage")');
  await expect(page.locator('div.region-content')).not.toContainText(
    'Test entity usage',
  );
});
