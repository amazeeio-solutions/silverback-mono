<?php

namespace Drupal\silverback_gutenberg\Plugin\GutenbergBlockMutator;

use Drupal\Core\Entity\ContentEntityInterface;
use Drupal\Core\Entity\EntityRepositoryInterface;
use Drupal\Core\Logger\LoggerChannelFactoryInterface;
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
   * MediaIdToUuidBlockMutator constructor.
   *
   * @param \Drupal\Core\Entity\EntityRepositoryInterface $repository
   */
  public function __construct(
    array $configuration,
    $plugin_id,
    $plugin_definition,
    private readonly EntityRepositoryInterface $entityRepository,
    private readonly LoggerChannelFactoryInterface $loggerFactory,
  ) {
    parent::__construct($configuration, $plugin_id, $plugin_definition);
  }

  /**
   * {@inheritDoc}
   */
  public static function create(ContainerInterface $container, array $configuration, $plugin_id, $plugin_definition): self {
    return new self(
      $configuration,
      $plugin_id,
      $plugin_definition,
      $container->get('entity.repository'),
      $container->get('logger.factory'),
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
      $this->entityRepository
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
          $entity = $this->entityRepository->loadEntityByUuid('media', $uuid);
          return $entity->id();
        }
        catch (\Throwable $e) {
          $this->loggerFactory->get('silverback_gutenberg')->warning(
            "MediaBlockMutator: Could not load media by uuid '{$uuid}' on import."
          );
          return $uuid;
        }
      },
      $block['attrs']['mediaEntityIds']
    );
  }
}
