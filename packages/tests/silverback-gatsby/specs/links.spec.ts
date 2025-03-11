import { gatsby } from '@amazeelabs/silverback-playwright';
import { expect, test } from '@playwright/test';

import { getIframe } from '../../silverback-drupal/common';

// TODO: Move to silverback-template.
test.skip('links open in parent frame, using parent frame base url, without iframe=true param in the url', async ({
  page,
}) => {
  await page.goto(`${gatsby.baseUrl}/en/form/for-testing-confirmation-options`);
  const iframe = await getIframe(page);
  await iframe.waitForSelector('body.silverback-iframe-links-processed');
  await iframe.click(
    '.form-item-optional-text-field .webform-element-description a',
  );
  expect(
    [
      `${gatsby.baseUrl}/en/article/with-everything`,
      // We may have a trailing slash in the URL.
      `${gatsby.baseUrl}/en/article/with-everything/`,
    ].includes(page.url()),
  ).toBeTruthy();
});
