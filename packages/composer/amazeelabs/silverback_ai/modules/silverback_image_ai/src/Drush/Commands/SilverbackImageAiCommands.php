<?php

namespace Drupal\silverback_image_ai\Drush\Commands;

use Drupal\Component\Plugin\Exception\InvalidPluginDefinitionException;
use Drupal\Component\Plugin\Exception\PluginNotFoundException;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\silverback_image_ai\ImageAiUtilities;
use Drupal\silverback_image_ai\MediaUpdaterBatch;
use Drush\Attributes as CLI;
use Drush\Commands\DrushCommands;
use Drush\Exceptions\UserAbortException;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * A Drush commandfile.
 */
final class SilverbackImageAiCommands extends DrushCommands {

  /**
   * Constructs a SilverbackImageAiCommands object.
   */
  public function __construct(
    private readonly EntityTypeManagerInterface $entityTypeManager,
    private readonly MediaUpdaterBatch $batch,
    private readonly ImageAiUtilities $service
  ) {
    parent::__construct();
  }

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container) {
    return new static(
      $container->get('entity_type.manager'),
      $container->get('silverback_image_ai.batch.updater'),
      $container->get('silverback_image_ai.utilities'),
    );
  }

  /**
   * Command description here.
   *
   * @param false[] $options
   *
   * @throws \Drupal\Component\Plugin\Exception\InvalidPluginDefinitionException
   * @throws \Drupal\Component\Plugin\Exception\PluginNotFoundException
   * @throws \Drush\Exceptions\UserAbortException
   */
  #[CLI\Command(name: 'silverback-image-ai:alt:generate', aliases: ['slb:alt:g'])]
  #[CLI\Option(name: 'update-all', description: 'Update all image alt texts. ATTENTION: This will overwrite existing alt texts.')]
  #[CLI\Usage(name: 'silverback-image-ai:alt:generate', description: 'Generate alt text for media images.')]
  public function commandName(array $options = [
    'update-all' => FALSE,
  ]) {
    $media_entities = [];
    if ($options['update-all']) {
      $this->io()->warning(dt('ATTENTION: This action will overwrite all existing media image alt texts.'));
      if ($this->io()->confirm(dt('Are you sure you want to update all existing alt texts?'), FALSE)) {
        $media_entities = $this->service->getMediaEntitiesToUpdateAll();
        $this->batch->create($media_entities);
      }
      else {
        throw new UserAbortException();
      }
    }
    else {
      try {
        $media_entities = $this->service->getMediaEntitiesToUpdateWithAlt();
        $this->batch->create($media_entities);
      }
      catch (InvalidPluginDefinitionException | PluginNotFoundException $e) {
        // @todo
      }
    }

    $this->logger()->success(dt('@count media images updated.', [
      '@count' => count($media_entities),
    ]));
  }

}
