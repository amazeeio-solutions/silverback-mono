<?php

namespace Drupal\silverback_image_ai;

use Drupal\Core\Entity\EntityInterface;
use Drupal\file\FileInterface;
use Drupal\media\MediaInterface;

/**
 * @todo Add interface description.
 */
interface ImageAiUtilitiesInterface {

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
   * @todo
   *   Implement a fallback mechanism to return default ALT text in case of API failure.
   */
  public function generateImageAlt(FileInterface $image, string $langcode);

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
   * @todo
   *   Extract the image processing logic to a separate method for improved
   *   code maintainability and readability.
   */
  public function getBase64EncodeData(FileInterface $image);

  /**
   * Sends a request to the OpenAI API to generate ALT text for an image.
   *
   * This private method takes base64-encoded image data and a language code as parameters.
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
   * @throws \Exception
   *   Thrown if the HTTP request to the OpenAI API fails.
   */
  public function sendOpenAiRequest(string $base_64_data, string $langcode);

  /**
   * Number of media entities with the 'image' bundle that are missing alt text.
   *
   * @return int
   *   The number of media entities missing alt text.
   *
   * @todo Create a db table to store data, query can be slow for large number of entities.
   */
  public function getMissingAltEntitiesCount();

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
   */
  public function setMediaImageAltText(MediaInterface $media, string $alt_text);

  /**
   * Emulates a fake response. Used for development.
   */
  public function getFakeResponseBody(string $base_64_data, string $langcode);

  /**
   * Retrieves the total count of media items of type 'image'.
   *
   * This function executes a database query to count the distinct media items
   * where the bundle is 'image' and the media ID (mid) is not null.
   *
   * @return int
   *   The total count of image media items.
   */
  public function getMediaImagesTotalCount();

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
   */
  public function getMediaEntitiesToUpdateAll();

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
   */
  public function getMediaEntitiesToUpdateWithAlt();

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
   */
  public function logUsage(array $response_body, EntityInterface $entity = NULL);

}
