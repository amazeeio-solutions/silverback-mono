import {
  drupal,
  drupalLogin,
  drupalLogout,
  drush,
  gatsby,
  resetDrupalState,
  waitForGatsby,
} from '@amazeelabs/silverback-playwright';
import { expect, PlaywrightTestArgs, test } from '@playwright/test';

import { getIframe } from '../../silverback-drupal/common';

test.beforeAll(async () => {
  await resetDrupalState();
  await waitForGatsby();
});

test('the unsupported confirmation type is replaced with the default value', async ({
  page,
}) => {
  const result = drush(
    `cget webform.webform.for_testing_confirmation_options settings.confirmation_type --include-overridden --format=json`,
  );
  const confirmationType = Object.values(JSON.parse(result))[0];
  expect(confirmationType).toEqual('page');

  await drupalLogin(page);
  await page.goto(
    `${drupal.baseUrl}/en/admin/structure/webform/manage/for_testing_confirmation_options/settings/confirmation`,
  );
  await expect(
    page.locator('input[name="confirmation_type"][value="inline"]'),
  ).toBeChecked();
});

test('only allowed confirmation types are listed in the webform config', async ({
  page,
}) => {
  const getOptions = async () => {
    await page.goto(
      `${drupal.baseUrl}/en/admin/structure/webform/manage/for_testing_confirmation_options/settings/confirmation`,
    );
    return Promise.all(
      (await page.$$('input[name="confirmation_type"]')).map((option) =>
        option.getAttribute('value'),
      ),
    );
  };

  await drupalLogin(page);

  // Case: limit_webform_confirmation_options is FALSE.
  // Can't use "drush cset" due to https://github.com/drush-ops/drush/issues/3793
  drush(
    `eval '\\Drupal::configFactory()->getEditable("silverback_iframe.settings")->set("limit_webform_confirmation_options", FALSE)->save();'`,
  );
  expect(await getOptions()).not.toEqual(confirmationOptions);

  // Case: limit_webform_confirmation_options is TRUE.
  drush(
    `-y cset silverback_iframe.settings limit_webform_confirmation_options true --input-format=yaml`,
  );
  expect(await getOptions()).toEqual(confirmationOptions);

  // Case: limit_webform_confirmation_options is missing.
  drush(`-y cdel silverback_iframe.settings`);
  expect(await getOptions()).toEqual(confirmationOptions);
});

test('confirmation type: inline', async ({ page }) => {
  await setConfirmationOption(page, 'inline', { addMessage: true });
  await submitWebform(page);

  expect(await page.innerHTML('.status-messages-inner')).toContain(
    '<div>Test message with <strong>some bold text.</strong></div>',
  );
  expect(await page.$('iframe')).toBeNull();
});

test('confirmation type: message', async ({ page }) => {
  await setConfirmationOption(page, 'message', { addMessage: true });
  await submitWebform(page);

  expect(await page.innerHTML('.status-messages-inner')).toContain(
    '<div>Test message with <strong>some bold text.</strong></div>',
  );
  expect(await page.$('iframe')).not.toBeNull();
});

test('confirmation type: url', async ({ page }) => {
  await setConfirmationOption(page, 'url', {
    setRedirectUrl: '/en/article/with-everything',
  });
  await submitWebform(page);
  await page.waitForURL(/\/en\/article\/with-everything/);

  // It's important to ensure that we are redirected to Gatsby, not to Drupal.
  expect(page.url()).toContain(gatsby.baseUrl);
});

test('confirmation type: url_message', async ({ page }) => {
  await setConfirmationOption(page, 'url_message', {
    addMessage: true,
    setRedirectUrl: '/en/article/other',
  });
  await submitWebform(page);
  await page.waitForURL(/\/en\/article\/other/);

  expect(await page.innerHTML('.status-messages-inner')).toContain(
    '<div>Test message with <strong>some bold text.</strong></div>',
  );
  // It's important to ensure that we are redirected to Gatsby, not to Drupal.
  expect(page.url()).toContain(gatsby.baseUrl);
});

test('confirmation type: none', async ({ page }) => {
  await setConfirmationOption(page, 'none');
  await submitWebform(page);

  expect(await page.$('iframe')).not.toBeNull();
  expect(await page.$('.status-messages-inner')).toBeNull();
});

test('confirmation type: message with fallback', async ({ page }) => {
  await setConfirmationOption(page, 'message', {
    addMessage:
      '<span class="hidden js-iframe-parent-message">The contact form has been submitted</span><div>You will be redirected back to the <a class="js-iframe-parent-redirect" href="/article/other">form</a>.</div>',
  });
  await submitWebform(page);

  expect(await page.innerHTML('.status-messages-inner')).toContain(
    'The contact form has been submitted',
  );
  expect(
    [
      // It's important to ensure that we are redirected to Gatsby, not to
      // Drupal.
      `${gatsby.baseUrl}/en/article/other`,
      // We may have a trailing slash in the URL.
      `${gatsby.baseUrl}/en/article/other/`,
    ].includes(page.url()),
  ).toBeTruthy();
});

const confirmationOptions = [
  'inline',
  'message',
  'url',
  'url_message',
  'none',
] as const;
type ConfirmationOption = (typeof confirmationOptions)[number];

const setConfirmationOption = async (
  page: PlaywrightTestArgs['page'],
  confirmationOption: ConfirmationOption,
  options?: {
    addMessage?: boolean | string;
    setRedirectUrl?: string;
  },
) => {
  await drupalLogin(page);
  await page.goto(
    `${drupal.baseUrl}/en/admin/structure/webform/manage/for_testing_confirmation_options/settings/confirmation`,
  );

  await page.click(
    `input[name="confirmation_type"][value="${confirmationOption}"]`,
  );

  if (options?.addMessage === true) {
    await page
      .getByRole('textbox', { name: 'Rich Text Editor. Editing' })
      .fill('Test message with ');
    await page.getByLabel('Bold').click();
    await page.keyboard.type('some bold text.');
  }
  if (typeof options?.addMessage === 'string') {
    await page.getByLabel('Source').click();
    await page.getByLabel('Source code editing area').fill(options.addMessage);
  }

  if (options?.setRedirectUrl) {
    await page.fill('input[name=confirmation_url]', options.setRedirectUrl);
  }

  await page.click('text=Save');
  await waitForGatsby();
  await drupalLogout(page);
};

const submitWebform = async (page: PlaywrightTestArgs['page']) => {
  await page.goto(`${gatsby.baseUrl}/en/form/for-testing-confirmation-options`);
  const iframe = await getIframe(page);
  await iframe.getByRole('button', { name: 'Submit' }).click();
};
