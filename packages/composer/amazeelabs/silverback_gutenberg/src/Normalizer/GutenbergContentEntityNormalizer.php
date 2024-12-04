<?php

namespace Drupal\silverback_gutenberg\Normalizer;

use Drupal\Core\Entity\ContentEntityInterface;
use Drupal\Core\Entity\EntityRepositoryInterface;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Extension\ModuleHandlerInterface;
use Drupal\Core\Language\LanguageManagerInterface;
use Drupal\default_content\Normalizer\ContentEntityNormalizer;
use Drupal\gutenberg\Parser\BlockParser;
use Drupal\node\Entity\Node;
use Drupal\silverback_gutenberg\BlockMutator\BlockMutatorManagerInterface;
use Drupal\silverback_gutenberg\BlockSerializer;
use Drupal\silverback_gutenberg\LinkedContentExtractor;
use Drupal\silverback_gutenberg\Utils;

/**
 * Class GutenbergContentEntityNormalizer
 *
 * Override for the ContentEntityNormalizer in default_content, replacing referenced
 * media entity id's with uuids, so they can be imported and exported reliably.
 *
 * @package Drupal\silverback_gutenberg\Normalizer
 */
class GutenbergContentEntityNormalizer extends ContentEntityNormalizer {

  /**
   * The block mutator plugin manager.
   *
   * @var \Drupal\silverback_gutenberg\BlockMutator\BlockMutatorManagerInterface
   */
  protected $blockMutatorManager;

  /**
   * Constructs an GutenbergContentEntityNormalizer object.
   *
   * @param \Drupal\Core\Entity\EntityTypeManagerInterface $entity_type_manager
   *   The entity type manager.
   * @param \Drupal\Core\Extension\ModuleHandlerInterface $module_handler
   *   The module handler.
   * @param \Drupal\Core\Entity\EntityRepositoryInterface $entity_repository
   *   The entity repository.
   * @param \Drupal\Core\Language\LanguageManagerInterface $language_manager
   *   The language manager.
   */
  public function __construct(
    EntityTypeManagerInterface $entity_type_manager,
    ModuleHandlerInterface $module_handler,
    EntityRepositoryInterface $entity_repository,
    LanguageManagerInterface $language_manager,
    BlockMutatorManagerInterface $block_mutator_manager,
  ) {
    parent::__construct($entity_type_manager, $module_handler, $entity_repository, $language_manager);
    $this->blockMutatorManager = $block_mutator_manager;
  }

  /**
   * {@inheritDoc}
   */
  protected function normalizeTranslation(ContentEntityInterface $entity, array $field_names) {
    $normalized = parent::normalizeTranslation($entity, $field_names);

    foreach (Utils::getGutenbergFields($entity) as $field) {
      if (isset($normalized[$field][0]['value'])) {
        // Parse the document, mutate it and re-assign it as the field value.
        $blocks = (new BlockParser())->parse($normalized[$field][0]['value']);
        $this->blockMutatorManager->mutateExport($blocks, $this->dependencies);
        $normalized[$field][0]['value'] = (new BlockSerializer())->serialize_blocks($blocks);

        // Register linked content as dependencies.
        // This is required to make the entity usage tracking work during the
        // default content import - the target entity should already exist at
        // the moment the referencing entity is imported.
        $linkExtractor = new LinkedContentExtractor();
        $references = $linkExtractor->getTargetEntities($normalized[$field][0]['value']);
        foreach ($references as $entityType => $uuids) {
          foreach ($uuids as $uuid) {
            $targetEntity = $this->entityRepository->loadEntityByUuid($entityType, $uuid);
            if ($targetEntity instanceof ContentEntityInterface) {
              $this->addDependency($targetEntity);
            }
          }
        }
      }
    }

    return $normalized;
  }

  /**
   * {@inheritDoc}
   */
  public function denormalize(array $data) {
    // Abort early if the current entity is not a node.
    if (!isset($data['_meta']['entity_type']) || $data['_meta']['entity_type'] !== 'node') {
      return parent::denormalize($data);
    }

    // Create an empty instance of that entity to easily get the relevant
    // field names.
    $entity = Node::create(['type' => $data['_meta']['bundle']]);
    foreach (Utils::getGutenbergFields($entity) as $field) {
      if (is_string($data['default'][$field][0]['value'])) {
        // Parse the document, mutate it and re-assign it as the payload.
        $blocks = (new BlockParser())->parse($data['default'][$field][0]['value']);
        $this->blockMutatorManager->mutateImport($blocks);
        $data['default'][$field][0]['value'] = (new BlockSerializer())->serialize_blocks($blocks);
      }
      if (isset($data['translations'])) {
        foreach(array_keys($data['translations']) as $langcode) {
          // Parse the translation document, mutate it and re-assign it as the payload.
          $blocks = (new BlockParser())->parse($data['translations'][$langcode][$field][0]['value']);
          $this->blockMutatorManager->mutateImport($blocks);
          $data['translations'][$langcode][$field][0]['value'] = (new BlockSerializer())->serialize_blocks($blocks);
        }
      }
    }

    // Pass the modified payload to the actual denormalization.
    return parent::denormalize($data);
  }
}
