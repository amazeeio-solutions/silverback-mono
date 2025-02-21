<?php

namespace Drupal\silverback_gutenberg\Plugin\EntityUsage\Track;

use Drupal\Core\Config\ConfigFactoryInterface;
use Drupal\Core\Entity\EntityFieldManagerInterface;
use Drupal\Core\Entity\EntityRepositoryInterface;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Field\FieldItemInterface;
use Drupal\entity_usage\EntityUsageInterface;
use Drupal\entity_usage\EntityUsageTrackBase;
use Drupal\entity_usage\UrlToEntityInterface;
use Drupal\silverback_gutenberg\LinkedContentExtractor;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Psr\Log\LoggerInterface;

/**
 * Tracks usage of linked content in Gutenberg editor.
 *
 * @EntityUsageTrack(
 *   id = "gutenberg_linked_content",
 *   label = @Translation("Linked content in Gutenberg"),
 *   description = @Translation("Tracks linked content entities in Gutenberg."),
 *   field_types = {"text", "text_long", "text_with_summary"},
 * )
 */
class GutenbergLinkedContent extends EntityUsageTrackBase {
  use GutenbergContentTrackTrait;

  /* @var \Drupal\silverback_gutenberg\LinkedContentExtractor */
  protected $linkedContentExtractor;

  public function __construct(
    array $configuration,
    $plugin_id,
    $plugin_definition,
    EntityUsageInterface $usage_service,
    EntityTypeManagerInterface $entity_type_manager,
    EntityFieldManagerInterface $entity_field_manager,
    ConfigFactoryInterface $config_factory,
    EntityRepositoryInterface $entity_repository,
    ?LoggerInterface $entityUsageLogger = NULL,
    ?UrlToEntityInterface $urlToEntity = NULL,
    ?array $always_track_base_fields = NULL,
    LinkedContentExtractor $linked_content_extractor
  ) {
    parent::__construct(
      $configuration, $plugin_id,
      $plugin_definition,
      $usage_service,
      $entity_type_manager,
      $entity_field_manager,
      $config_factory,
      $entity_repository,
      $entityUsageLogger,
      $urlToEntity,
      $always_track_base_fields
    );
    $this->linkedContentExtractor = $linked_content_extractor;
  }

  /**
   * {@inheritDoc}
   */
  public static function create(ContainerInterface $container, array $configuration, $plugin_id, $plugin_definition) {
    return new static(
      $configuration,
      $plugin_id,
      $plugin_definition,
      $container->get('entity_usage.usage'),
      $container->get('entity_type.manager'),
      $container->get('entity_field.manager'),
      $container->get('config.factory'),
      $container->get('entity.repository'),
      $container->get('logger.channel.entity_usage'),
      $container->get(UrlToEntityInterface::class),
      $container->getParameter('entity_usage')['always_track_base_fields'] ?? [],
      $container->get('silverback_gutenberg.linked_content_extractor')
    );
  }

  /**
   * {@inheritDoc}
   */
  public function getTargetEntities(FieldItemInterface $item): array {
    $itemValue = $item->getValue();
    if (empty($itemValue['value'])) {
      return [];
    }
    $references = $this->linkedContentExtractor->getTargetEntities($itemValue['value']);
    if (empty($references)) {
      return [];
    }
    return $this->convertReferencesToEntityUsageList($references);
  }
}
