<?php

declare(strict_types=1);

namespace Drupal\silverback_image_ai;

use Drupal\Core\Batch\BatchBuilder;
use Drupal\Core\Logger\LoggerChannelFactoryInterface;
use Drupal\Core\Logger\LoggerChannelInterface;
use Drupal\Core\StringTranslation\StringTranslationTrait;

/**
 * Methods for running the ConfigImporter in a batch.
 *
 * @see \Drupal\Core\Config\ConfigImporter
 */
class MediaUpdaterBatch {
  use StringTranslationTrait;

  /**
   * The logger channel.
   *
   * @var \Drupal\Core\Logger\LoggerChannelInterface
   */
  protected LoggerChannelInterface $loggerChannel;

  /**
   * Constructor.
   *
   * @param \Drupal\Core\Logger\LoggerChannelFactoryInterface $loggerFactory
   *   The logger factory.
   */
  public function __construct(LoggerChannelFactoryInterface $loggerFactory) {
    $this->loggerChannel = $loggerFactory->get('silverback_image_ai');
  }

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
  public function create(array $items): void {

    $batchBuilder = (new BatchBuilder())
      ->setTitle($this->t('Running media image updates...'))
      ->setFinishCallback([self::class, 'finish'])
      ->setInitMessage('The initialization message (optional)')
      ->setProgressMessage('Completed @current of @total. See other placeholders.');

    $total = count($items);
    $count = 0;
    // Create multiple batch operations based on the $batchSize.
    foreach ($items as $item) {
      $batch = [
        'item' => $item,
        'count' => $count++,
        'total' => $total,
      ];
      $batchBuilder->addOperation([MediaUpdaterBatch::class, 'process'], [$batch]);
    }

    batch_set($batchBuilder->toArray());
    if (function_exists('drush_backend_batch_process') && PHP_SAPI === 'cli') {
      drush_backend_batch_process();
    }
  }

  /**
   * Batch operation callback.
   *
   * @param array $batch
   *   Information about batch (items, size, total, ...).
   * @param array $context
   *   Batch context.
   */
  public static function process(array $batch, array &$context) {
    // Process elements stored in each batch (operation).
    $processed = !empty($context['results']) ? count($context['results']) : $batch['count'];
    $entity = $batch['item']['entity'];

    $service = \Drupal::service('silverback_image_ai.utilities');
    $alt_text = '-';
    $file = $entity->field_media_image->entity;
    if ($file) {
      $alt_text = $service->generateImageAlt($file, $batch['item']['langcode']);
      $service->setMediaImageAltText($entity, $alt_text);
    }

    $context['message'] = t('Processing media item @processed/@total with id: @id (@langcode) ', [
      '@processed' => $processed,
      '@total' => $batch['total'],
      '@id' => $entity->id(),
      '@langcode' => $batch['item']['langcode'],
    ]);

    sleep(1);
  }

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
  public static function finish(bool $success, array $results, array $operations) {
    $messenger = \Drupal::messenger();
    if ($success) {
      $messenger->addStatus(t('Items processed successfully.'));
    }
    else {
      // An error occurred.
      // $operations contains the operations that remained unprocessed.
      $error_operation = reset($operations);
      $message = t('An error occurred while processing %error_operation with arguments: @arguments',
      ['%error_operation' => $error_operation[0], '@arguments' => print_r($error_operation[1], TRUE)]);
      $messenger->addError($message);
    }
  }

}
