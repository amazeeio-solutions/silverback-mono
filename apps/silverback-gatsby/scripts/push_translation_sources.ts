import axios from 'axios';
import { existsSync, readFileSync } from 'fs';

const pushTranslationSources = async (translationSourcesPath) => {
  if (
    !process.env.DRUPAL_BASE_URL ||
    !process.env.DRUPAL_CREATE_TRANSLATIONS_SOURCE_PATH ||
    !process.env.DRUPAL_USER_NAME ||
    !process.env.DRUPAL_USER_PASS
  ) {
    console.warn('Warning: Drupal env vars are not set.');
    return;
  }

  if (!existsSync(translationSourcesPath)) {
    console.warn(
      'Warning: the translations sources file does not exist. Please make sure you specify a valid path and make sure you run the translations:extract pnpm command before.',
    );
    return;
  }
  const url = `${process.env.DRUPAL_BASE_URL}${process.env.DRUPAL_CREATE_TRANSLATIONS_SOURCE_PATH}`;
  const translationSources = readFileSync(translationSourcesPath, {
    encoding: 'utf-8',
  });
  try {
    await axios
      .post(url, translationSources, {
        headers: {
          'api-key': 'aadecf7602d1e19a66dd80d9b86b8fd9',
        },
      })
      .then((response) => {
        console.log(response.data);
        return;
      });
  } catch (e) {
    console.warn(
      'Warning: Cannot call the create translations endpoint.',
      e.toString(),
    );
    console.debug(e);
  }
};

pushTranslationSources(process.argv[2]);
