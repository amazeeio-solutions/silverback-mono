<?php

declare(strict_types=1);

namespace Drupal\silverback_image_ai;

/**
 * Methods for running the ConfigImporter in a batch.
 *
 * @see \Drupal\Core\Config\ConfigImporter
 */
interface MediaUpdaterBatchInterface {

  /**
   * Creates a batch operation to process media image updates.
   *
   * This method initializes a batch process for updating media images, setting
   * up the batch operations and conditions for Drush integration if run via CLI.
   *
   * @param array $items
   *   An array of items to be processed in the batch. Each item represents
   *   a single media entity requiring updates.
   *
   * @return void
   */
  public function create(array $media_entities = []);

  /**
   * Batch operation callback.
   *
   * @param array $batch
   *   Information about batch (items, size, total, ...).
   * @param array $context
   *   Batch context.
   */
  public static function process(array $batch, array &$context);

  /**
   * Finish batch.
   *
   * This function is a static function to avoid serializing the ConfigSync
   * object unnecessarily.
   *
   * @param bool $success
   *   Indicate that the batch API tasks were all completed successfully.
   * @param array $results
   *   An array of all the results that were updated in update_do_one().
   * @param array $operations
   *   A list of the operations that had not been completed by the batch API.
   */
  public static function finish(bool $success, array $results, array $operations);

}
