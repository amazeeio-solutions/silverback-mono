<?php

namespace Drupal\silverback_gutenberg\Plugin\EntityUsage\Track;

use Drupal\Core\Config\ConfigFactoryInterface;
use Drupal\Core\Entity\EntityFieldManagerInterface;
use Drupal\Core\Entity\EntityRepositoryInterface;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Field\FieldItemInterface;
use Drupal\Core\Path\PathValidatorInterface;
use Drupal\Core\StreamWrapper\StreamWrapperInterface;
use Drupal\entity_usage\EntityUsageInterface;
use Drupal\entity_usage\EntityUsageTrackBase;
use Drupal\gutenberg\Parser\BlockParser;
use Drupal\silverback_gutenberg\ReferencedContentExtractor;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * Tracks usage of referenced content in Gutenberg editor.
 *
 * @EntityUsageTrack(
 *   id = "gutenberg_referenced_content",
 *   label = @Translation("Referenced content in Gutenberg"),
 *   description = @Translation("Tracks referenced content entities in Gutenberg."),
 *   field_types = {"text", "text_long", "text_with_summary"},
 * )
 */
class GutenbergReferencedContent extends EntityUsageTrackBase {
  use GutenbergContentTrackTrait;

  /* @var \Drupal\silverback_gutenberg\ReferencedContentExtractor */
  protected $referencedContentExtractor;

  public function __construct(
    array $configuration,
    $plugin_id,
    $plugin_definition,
    EntityUsageInterface $usage_service,
    EntityTypeManagerInterface $entity_type_manager,
    EntityFieldManagerInterface $entity_field_manager,
    ConfigFactoryInterface $config_factory,
    EntityRepositoryInterface $entity_repository,
    PathValidatorInterface $path_validator,
    StreamWrapperInterface $public_stream,
    ReferencedContentExtractor $referenced_content_extractor
  ) {
    parent::__construct($configuration, $plugin_id, $plugin_definition, $usage_service, $entity_type_manager, $entity_field_manager, $config_factory, $entity_repository, $path_validator, $public_stream);
    $this->referencedContentExtractor = $referenced_content_extractor;
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
      $container->get('path.validator'),
      $container->get('stream_wrapper.public'),
      $container->get('silverback_gutenberg.referenced_content_extractor')
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
    $text = $itemValue['value'];
    $blockParser = new BlockParser();
    $blocks = $blockParser->parse($text);
    $references = $this->referencedContentExtractor->getTargetEntities($blocks);

    if (empty($references)) {
      return [];
    }
    return $this->convertReferencesToEntityUsageList($references);
  }
}
