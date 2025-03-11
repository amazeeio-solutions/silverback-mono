import {
  drupal,
  drupalLogin,
  gatsby,
  resetDrupalState,
  waitForGatsby,
} from '@amazeelabs/silverback-playwright';
import { expect, test } from '@playwright/test';

test.beforeAll(async () => {
  await resetDrupalState();
  await waitForGatsby();
});
test.afterAll(async () => {
  await resetDrupalState();
});

test('references', async ({ page }) => {
  // Check the tag present on the page.
  await page.goto(gatsby.baseUrl);
  await page.click('a:text-is("With everything")');
  await expect(page.locator(':text("Tag 1")')).toHaveCount(1);

  // Remove the tag.
  await drupalLogin(page);
  await page.goto(
    `${drupal.baseUrl}/admin/structure/taxonomy/manage/tag/overview`,
  );
  await page.click(
    '.dropbutton-wrapper :text-is("Edit"):right-of(:text-is("Tag 1"))',
  );
  await page.click('.tabs--primary :text-is("Delete")');
  await page.click('.button--primary');
  await page.waitForSelector(':text("Deleted term")');
  await waitForGatsby();

  // Check the tag has gone.
  await page.goto(gatsby.baseUrl);
  await page.click('a:text-is("With everything")');
  await expect(page.locator(':text("Tag 1")')).toHaveCount(0);
});
