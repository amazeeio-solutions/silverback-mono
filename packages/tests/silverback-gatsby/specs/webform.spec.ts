import { gatsby } from '@amazeelabs/silverback-playwright';
import { expect, test } from '@playwright/test';

import { getIframe } from '../../silverback-drupal/common';

// TODO: Move to silverback-template.
test.skip('injected CSS styles', async ({ page }) => {
  // Check if it isn't green by default.
  await page.goto(`${gatsby.baseUrl}/en/form/for-testing-confirmation-options`);
  await expect((await getIframe(page)).locator('h1')).not.toHaveCSS(
    'color',
    'rgb(0, 128, 0)',
  );

  // Inject CSS.
  await page.goto(
    `${gatsby.baseUrl}/en/form/for-testing-confirmation-options?test-inject-css=true`,
  );
  // Check if it's green.
  await expect((await getIframe(page)).locator('h1')).toHaveCSS(
    'color',
    'rgb(0, 128, 0)',
  );
  // Check if we have additional margin at the bottom of the field.
  await expect(
    (await getIframe(page)).locator('.form-item-optional-text-field'),
  ).toHaveCSS('margin-bottom', '200px');
  // Check if the iframe was resized. We should still see the Submit button.
  await expect((await getIframe(page)).locator('text=Submit')).toBeVisible();
});
