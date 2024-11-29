<?php

namespace Drupal\silverback_image_ai;

use Drupal\Core\Config\ConfigFactoryInterface;
use Drupal\Core\Entity\EntityInterface;
use Drupal\Core\Entity\EntityTypeManager;
use Drupal\Core\Logger\LoggerChannelFactoryInterface;
use Drupal\Core\StringTranslation\StringTranslationTrait;
use Drupal\file\FileInterface;
use Drupal\media\MediaInterface;
use Drupal\silverback_ai\HttpClient\OpenAiHttpClient;
use Drupal\silverback_ai\TokenUsageInterface;
use Psr\Http\Client\ClientInterface;

/**
 * @todo Add class description.
 */
final class ImageAiUtilities implements ImageAiUtilitiesInterface {

  private const DEFAULT_AI_MODEL = 'gpt-4o-mini';
  private const DEFAULT_WORD_LENGTH = 40;

  use StringTranslationTrait;

  /**
   * Constructs an AltAiGenerator object.
   */
  public function __construct(
    private readonly LoggerChannelFactoryInterface $loggerFactory,
    private readonly ConfigFactoryInterface $configFactory,
    private readonly ClientInterface $httpClient,
    private readonly TokenUsageInterface $silverbackAiTokenUsage,
    private readonly OpenAiHttpClient $openAiHttpClient,
    private readonly EntityTypeManager $entityTypeManager,
  ) {}

  /**
   * Generates an ALT text for an image using the OpenAI API.
   *
   * This method takes an image file and a language code to generate
   * a descriptive ALT text for the image. It utilizes the OpenAI API
   * for ALT text generation if the API key is available.
   *
   * @param \Drupal\file\FileInterface $image
   *   The image file for which ALT text needs to be generated.
   * @param string $langcode
   *   The language code representing the language in which the ALT text
   *   should be generated. Defaults to English if not specified or invalid.
   *
   * @return string|null
   *   The generated ALT text if successful, a message indicating a missing API key,
   *   or NULL if the API response does not contain the expected data.
   *
   * @throws \Exception
   *
   * @todo
   *   Implement a fallback mechanism to return default ALT text in case of API failure.
   */
  public function generateImageAlt(FileInterface $image, string $langcode) {

    $base_64_data = $this->getBase64EncodeData($image);

    if (getenv('SILVERBACK_IMAGE_AI_DRY_RUN')) {
      $response_body = $this->getFakeResponseBody($base_64_data, $langcode);
    }
    else {
      $response_body = $this->sendOpenAiRequest($base_64_data, $langcode);
    }

    $this->logUsage($response_body, $image);

    if ($this->configFactory->get('silverback_image_ai.settings')->get('debug_mode')) {
      \Drupal::logger('debug')->debug('<pre>' . print_r($response_body, TRUE) . "</pre>");
    }

    if (isset($response_body['choices'][0]['message']['content'])) {
      return trim($response_body['choices'][0]['message']['content']);
    }

    return NULL;
  }

  /**
   * Converts an image file to a base64-encoded string.
   *
   * This method takes an image file represented by a FileInterface object,
   * processes it through a specified image style to ensure the desired derivative
   * is created, and then returns the image data encoded in base64 format,
   * suitable for embedding in HTML.
   *
   * @param \Drupal\file\FileInterface $image
   *   The image file object for which the base64 data needs to be generated.
   *
   * @return string
   *   A string containing the base64-encoded image data prefixed with the
   *   appropriate data URI scheme and mime type.
   *
   * @throws \Drupal\Component\Plugin\Exception\InvalidPluginDefinitionException
   * @throws \Drupal\Component\Plugin\Exception\PluginNotFoundException
   *
   * @todo
   *   Extract the image processing logic to a separate method for improved
   *   code maintainability and readability.
   */
  public function getBase64EncodeData(FileInterface $image) {
    // @todo Extract this to method
    $image_uri = $image->getFileUri();
    $image_type = $image->getMimeType();
    $fileSystem = \Drupal::service('file_system');

    /** @var \Drupal\image\ImageStyleInterface $image_style */
    $image_style = \Drupal::entityTypeManager()->getStorage('image_style')->load('large');

    // Create image derivatives if they not already exists.
    if ($image_style) {
      $derivative_uri = $image_style->buildUri($image_uri);
      if (!file_exists($derivative_uri)) {
        $image_style->createDerivative($image_uri, $derivative_uri);
      }
      $absolute_path = $fileSystem->realpath($derivative_uri);
    }
    else {
      $absolute_path = $fileSystem->realpath($image_uri);
    }

    $image_file = file_get_contents($absolute_path);
    $base_64_image = base64_encode($image_file);
    return "data:$image_type;base64,$base_64_image";
  }

  /**
   * Sends a request to the OpenAI API to generate ALT text for an image.
   *
   * This method takes base64-encoded image data and a language code as parameters.
   * It constructs a payload for the OpenAI API using the specified model and message format,
   * including an instruction to generate a concise ALT text for the image in the specified language.
   *
   * @param string $base_64_data
   *   The base64-encoded data of the image for which to generate ALT text.
   * @param string $langcode
   *   The language code for the language in which the ALT text should be generated.
   *
   * @return array
   *   The decoded JSON response from the OpenAI API containing the generated ALT text.
   *
   * @throws \Exception|\GuzzleHttp\Exception\GuzzleException
   *   Thrown if the HTTP request to the OpenAI API fails.
   */
  public function sendOpenAiRequest(string $base_64_data, string $langcode) {
    $language_name = $langcode ? \Drupal::languageManager()->getLanguageName($langcode) : 'English';
    // @todo Get some of these from settings
    $model = $this->configFactory->get('silverback_image_ai.settings')->get('ai_model') ?: self::DEFAULT_AI_MODEL;
    $words = $this->configFactory->get('silverback_image_ai.settings')->get('words_length') ?: self::DEFAULT_WORD_LENGTH;

    $context = $this->configFactory->get('silverback_image_ai.settings')->get('alt_ai_context');

    if (!empty($context)) {
      $prompt = "Given the following context:\r\n'{$context}' \r\n";
      $prompt .= "generate a concise and descriptive ALT text for this image. The ALT text should be a single sentence, no more than {$words} words long. The Alt text should be in the {$language_name} language.";
    }
    else {
      $prompt = "Generate a concise and descriptive ALT text for this image. The ALT text should be a single sentence, no more than {$words} words long. The Alt text should be in the {$language_name} language.";
    }

    $payload = [
      'model' => $model,
      'messages' => [
        [
          'role' => 'user',
          'content' => [
                [
                  'type' => 'text',
                  'text' => $prompt,
                ],
                [
                  'type' => 'image_url',
                  'image_url' => [
                    "url" => $base_64_data,
                  ],
                ],
          ],
        ],
      ],
      'max_tokens' => 100,
    ];

    try {
      $response = $this->openAiHttpClient->post('chat/completions', [
        'json' => $payload,
      ]);
    }
    catch (\Exception $e) {
      throw new \Exception('HTTP request failed: ' . $e->getMessage());
    }

    $responseBodyContents = $response->getBody()->getContents();
    return json_decode($responseBodyContents, TRUE, 512, JSON_THROW_ON_ERROR);
  }

  /**
   * Number of media entities with the 'image' bundle that are missing alt text.
   *
   * @return int
   *   The number of media entities missing alt text.
   *
   * @throws \Drupal\Component\Plugin\Exception\InvalidPluginDefinitionException
   * @throws \Drupal\Component\Plugin\Exception\PluginNotFoundException
   *
   * @todo Create a db table to store data, query can be slow for large number of entities.
   */
  public function getMissingAltEntitiesCount() {
    $count = 0;
    // @todo Add DI
    $media_entities = \Drupal::entityTypeManager()->getStorage('media')->loadByProperties([
      'bundle' => 'image',
    ]);
    foreach ($media_entities as $media) {
      foreach ($media->getTranslationLanguages() as $langcode => $translation) {
        $entity = $media->getTranslation($langcode);
        if (!$entity->field_media_image->alt) {
          $count++;
        }
      }
    }
    return $count;
  }

  /**
   * Sets the alt text for the media image field.
   *
   * This method updates the alt text of the given media entity's image field.
   * It saves the changes to the entity unless the 'SILVERBACK_IMAGE_AI_DRY_RUN' environment
   * variable is set. The method is intended for use with Drupal media entities.
   *
   * @param \Drupal\media\Entity\Media $media
   *   The media entity whose image alt text is being set.
   * @param string $alt_text
   *   The alt text to set for the media image.
   *
   * @throws \Drupal\Core\Entity\EntityStorageException
   */
  public function setMediaImageAltText(MediaInterface $media, string $alt_text) {
    /** @var \Drupal\media\Entity\Media $media */
    $media->field_media_image->alt = $alt_text;
    if (!getenv('SILVERBACK_IMAGE_AI_DRY_RUN')) {
      $media->save();
    }
  }

  /**
   * Emulates a fake response. Used for development.
   */
  public function getFakeResponseBody(string $base_64_data, string $langcode) {
    return [
      "id" => "chatcmpl-AJe6memR1kLukQdK957wAFydW54rK",
      "object" => "chat.completion",
      "created" => 1729245772,
      "model" => "gpt-4o-mini",
      "choices" => [
        0 => [
          "index" => 0,
          "message" => [
            "role" => "assistant",
            "content" => "A group of three people collaborating around a table with laptops and data displays.",
            "refusal" => NULL,
          ],
          "logprobs" => NULL,
          "finish_reason" => "stop",
        ],
      ],
      "usage" => [
        "prompt_tokens" => 25536,
        "completion_tokens" => 15,
        "total_tokens" => 25551,
        "prompt_tokens_details" => [
          "cached_tokens" => 0,
        ],
        "completion_tokens_details" => [
          "reasoning_tokens" => 0,
        ],
      ],
      "system_fingerprint" => "fp_8552ec53e1",
    ];
  }

  /**
   * Retrieves the total count of media items of type 'image'.
   *
   * This function executes a database query to count the distinct media items
   * where the bundle is 'image' and the media ID (mid) is not null.
   *
   * @return int
   *   The total count of image media items.
   */
  public function getMediaImagesTotalCount() {
    $query = \Drupal::database()->select('media', 'm')
      ->fields('m', ['mid'])
      ->condition('bundle', 'image')
      ->isNotNull('mid')
      ->distinct();
    return (int) $query->countQuery()->execute()->fetchField();
  }

  /**
   * Gets a list of media entities.
   *
   * This function loads media entities of the 'image' bundle and iterates over
   * their translations. It builds and returns an array of entities with language
   * codes.
   *
   * @return array
   *   An array of arrays, each containing:
   *   - entity: The media entity translation.
   *   - langcode: The language code of the translation.
   *
   * @throws \Drupal\Component\Plugin\Exception\InvalidPluginDefinitionException
   * @throws \Drupal\Component\Plugin\Exception\PluginNotFoundException
   */
  public function getMediaEntitiesToUpdateAll() {
    $entities = [];
    $media_entities = $this->entityTypeManager->getStorage('media')->loadByProperties([
      'bundle' => 'image',
    ]);
    foreach ($media_entities as $media) {
      foreach ($media->getTranslationLanguages() as $langcode => $translation) {
        $entity = $media->getTranslation($langcode);
        $entities[] = [
          'entity' => $entity,
          'langcode' => $langcode,
        ];
      }
    }
    return $entities;
  }

  /**
   * Gets a list of media entities to update without alt value.
   *
   * This function loads media entities of the 'image' bundle and iterates over
   * their translations. It builds and returns an array of entities with language
   * codes.
   *
   * @return array
   *   An array of arrays, each containing:
   *   - entity: The media entity translation.
   *   - langcode: The language code of the translation.
   *
   * @throws \Drupal\Component\Plugin\Exception\InvalidPluginDefinitionException
   * @throws \Drupal\Component\Plugin\Exception\PluginNotFoundException
   */
  public function getMediaEntitiesToUpdateWithAlt() {
    $entities = [];
    $media_entities = $this->entityTypeManager->getStorage('media')->loadByProperties([
      'bundle' => 'image',
    ]);
    foreach ($media_entities as $media) {
      foreach ($media->getTranslationLanguages() as $langcode => $translation) {
        $entity = $media->getTranslation($langcode);
        if (!$entity->field_media_image->alt) {
          $entities[] = [
            'entity' => $entity,
            'langcode' => $langcode,
          ];
        }
      }
    }
    return $entities;
  }

  /**
   * Logs the usage of the Silverback Image AI module.
   *
   * This method updates the response body with module and entity details and
   * creates a new usage entry using the Silverback AI Token Usage service.
   *
   * @param array $response_body
   *   An associative array that will be enhanced with module and entity information.
   * @param \Drupal\Core\Entity\EntityInterface|null $entity
   *   The entity for which to log usage details. If provided, its id, type,
   *   and revision id will be added to the response body if the entity is revisionable.
   *
   * @throws \Exception
   */
  public function logUsage(array $response_body, EntityInterface $entity = NULL) {
    // ..
    $response_body['module'] = 'Silverback Image AI';

    if ($entity) {
      $response_body['entity_id'] = (string) $entity->id();
      $response_body['entity_type_id'] = (string) $entity->getEntityTypeId();
      if ($entity->getEntityType()->isRevisionable()) {
        $response_body['entity_revision_id'] = (string) $entity->getRevisionId();
      }
    }

    $this->silverbackAiTokenUsage->createUsageEntry($response_body);
  }

}
