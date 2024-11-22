import { expect, PlaywrightTestArgs } from '@playwright/test';
import { execSync } from 'child_process';

export const gatsby = {
  baseUrl: 'http://127.0.0.1:8000',
};

export const drupal = {
  baseUrl: 'http://127.0.0.1:8888',
  path: '../../../apps/silverback-drupal',
};

export const drush = (cmd: string): string => {
  return execSync(
    `pnpm --filter "@-amazeelabs/silverback-drupal" exec -- pnpm --silent drush ${cmd}`,
  ).toString();
};

export const waitForGatsby = async () => {
  const gatsbyStatus = async (): Promise<'building' | 'ready' | 'outdated'> => {
    let gatsbyBuildId;
    try {
      const response = await (
        await fetch(gatsby.baseUrl + '/build.json')
      ).json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      gatsbyBuildId = (response as any).drupalBuildId.toString();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      gatsbyBuildId = null;
    }

    if (gatsbyBuildId === null) {
      return 'building';
    }

    const drupalBuildId = drush(
      `eval 'echo \\Drupal::service("silverback_gatsby.update_tracker")->latestBuild("silverback_gatsby")'`,
    );

    return drupalBuildId === gatsbyBuildId ? 'ready' : 'outdated';
  };

  const status = await gatsbyStatus();

  if (status === 'ready') {
    return;
  }

  const timeout = setTimeout(() => {
    throw new Error('Gatsby took too long to build.');
  }, 90_000);

  if (status === 'outdated') {
    // Sometimes this request fails in CI.
    let attempt = 0;
    const maxAttempts = 3;
    while (attempt < maxAttempts) {
      attempt++;
      try {
        await fetch(gatsby.baseUrl + '/___status/build', {
          method: 'post',
        });
        break;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (e) {
        console.warn(`Could not trigger a build on attempt ${attempt}`);
        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    }
  }

  while ((await gatsbyStatus()) !== 'ready') {
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  clearTimeout(timeout);
};

export const resetDrupalState = async () => {
  execSync(
    'pnpm run --filter "@-amazeelabs/silverback-drupal" snapshot-restore',
  );
};

export const drupalLogin = async (
  page: PlaywrightTestArgs['page'],
  user?: string,
) => {
  await page.goto(drupal.baseUrl + '/user/login');
  await page.getByRole('textbox', { name: 'Username' }).fill(user || 'admin');
  await page.getByRole('textbox', { name: 'Password' }).fill(user || 'admin');
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(
    page.getByRole('heading', { name: 'admin', exact: true }),
  ).toHaveCount(1);
};

export const drupalLogout = async (page: PlaywrightTestArgs['page']) => {
  await page.goto(drupal.baseUrl + '/user/logout');
};
