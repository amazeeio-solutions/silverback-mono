<?php

namespace Drupal\silverback_gutenberg\Plugin\GutenbergBlockMutator;

use Drupal\Core\Entity\ContentEntityInterface;
use Drupal\Core\Entity\EntityRepositoryInterface;
use Drupal\Core\Plugin\ContainerFactoryPluginInterface;
use Drupal\silverback_gutenberg\BlockMutator\BlockMutatorBase;
use Drupal\silverback_gutenberg\Attribute\GutenbergBlockMutator;
use Drupal\Core\StringTranslation\TranslatableMarkup;
use Symfony\Component\DependencyInjection\ContainerInterface;

#[GutenbergBlockMutator(
  id: "media_block_mutator",
  label: new TranslatableMarkup("Media ID to UUID and viceversa mutator"),
)]
class MediaBlockMutator extends BlockMutatorBase implements ContainerFactoryPluginInterface {

  /**
   * An entity repository to load entities from.
   *
   * @var \Drupal\Core\Entity\EntityRepositoryInterface
   */
  protected EntityRepositoryInterface $repository;

  /**
   * MediaIdToUuidBlockMutator constructor.
   *
   * @param \Drupal\Core\Entity\EntityRepositoryInterface $repository
   */
  public function __construct(array $configuration, $plugin_id, $plugin_definition, EntityRepositoryInterface $repository) {
    parent::__construct($configuration, $plugin_id, $plugin_definition);
    $this->repository = $repository;
  }

  /**
   * {@inheritDoc}
   */
  public static function create(ContainerInterface $container, array $configuration, $plugin_id, $plugin_definition) {
    return new static(
      $configuration,
      $plugin_id,
      $plugin_definition,
      $container->get('entity.repository'),
    );
  }

  /**
   * {@inheritDoc}
   */
  public function applies(array $block) : bool {
    return isset($block['attrs']['mediaEntityIds']);
  }

  /**
   * {@inheritDoc}
   */
  public function mutateExport(array &$block, array &$dependencies) : void {
    $block['attrs']['mediaEntityIds'] = array_values(array_map(
      function (ContentEntityInterface $entity) use (&$dependencies) {
        $dependencies[$entity->uuid()] = 'media';
        return $entity->uuid();
      },
      $this->repository
        ->getCanonicalMultiple('media', $block['attrs']['mediaEntityIds'])
    ));
  }

  /**
   * {@inheritDoc}
   */
  public function mutateImport(array &$block) : void {
    $block['attrs']['mediaEntityIds'] = array_map(
      function (string $uuid) {
        try {
          $entity = $this->repository->loadEntityByUuid('media', $uuid);
          return $entity->id();
        }
        catch (\Throwable $e) {
          \Drupal::logger('silverback_gutenberg')->warning(
            "MediaBlockMutator: Could not load media by uuid '{$uuid}' on import."
          );
          return $uuid;
        }
      },
      $block['attrs']['mediaEntityIds']
    );
  }
}
