<?php

declare(strict_types = 1);

namespace Drupal\silverback_preview_link\Entity;

use Drupal\Component\Assertion\Inspector;
use Drupal\Core\Entity\ContentEntityBase;
use Drupal\Core\Entity\EntityInterface;
use Drupal\Core\Entity\EntityStorageInterface;
use Drupal\Core\Entity\EntityTypeInterface;
use Drupal\Core\Field\BaseFieldDefinition;
use Drupal\Core\Field\FieldStorageDefinitionInterface;
use Drupal\Core\Url;
use Drupal\user\Entity\User;

/**
 * Defines the Silverback preview link entity class.
 *
 * @ContentEntityType(
 *   id = "silverback_preview_link",
 *   label = @Translation("Preview Link"),
 *   base_table = "silverback_preview_link",
 *   handlers = {
 *     "storage" = "Drupal\silverback_preview_link\PreviewLinkStorage",
 *     "form" = {
 *       "silverback_preview_link" = "Drupal\silverback_preview_link\Form\PreviewLinkForm"
 *     }
 *   },
 *   entity_keys = {
 *     "id" = "id"
 *   }
 * )
 *
 * @property \Drupal\dynamic_entity_reference\Plugin\Field\FieldType\DynamicEntityReferenceFieldItemList $entities
 */
class SilverbackPreviewLink extends ContentEntityBase implements SilverbackPreviewLinkInterface {

  /**
   * Keep track on whether we need a new token upon save.
   *
   * @var bool
   */
  protected $needsNewToken = FALSE;
  /**
   * {@inheritDoc}
   */
  public function postCreate(EntityStorageInterface $storage) {
    parent::postCreate($storage);
    // If there is a default preview user set, then we add that user to the list
    // of entities attached to the link.
    $state = \Drupal::state();
    $default_preview_user = $state->get('silverback_preview_link.default_preview_user');
    if ($default_preview_user) {
      $this->addEntity(User::load($default_preview_user));
    }
  }

  /**
   * {@inheritdoc}
   */
  public function getUrl(EntityInterface $entity): Url {
    return Url::fromRoute(sprintf('entity.%s.silverback_preview_link', $entity->getEntityTypeId()), [
      $entity->getEntityTypeId() => $entity->id(),
      'preview_token' => $this->getToken(),
    ]);
  }

  /**
   * {@inheritdoc}
   */
  public function getToken(): string {
    return $this->get('token')->value;
  }

  /**
   * {@inheritdoc}
   */
  public function setToken($token) {
    $this->set('token', $token);
    // Add a second so our testing always works.
    $this->set('generated_timestamp', time() + 1);
    return $this;
  }

  /**
   * {@inheritdoc}
   */
  public function regenerateToken($needs_new_token = FALSE): bool {
    $current_value = $this->needsNewToken;
    $this->needsNewToken = $needs_new_token;
    return $current_value;
  }

  /**
   * {@inheritdoc}
   */
  public function getGeneratedTimestamp(): int {
    return (int) $this->get('generated_timestamp')->value;
  }

  /**
   * {@inheritdoc}
   */
  public function getEntities(): array {
    return $this->entities->referencedEntities();
  }

  /**
   * {@inheritdoc}
   */
  public function setEntities(array $entities) {
    assert(Inspector::assertAllObjects($entities, EntityInterface::class));
    return $this->set('entities', $entities);
  }

  /**
   * {@inheritdoc}
   */
  public function addEntity(EntityInterface $entity) {
    $this->entities->appendItem($entity);
    return $this;
  }

  /**
   * {@inheritdoc}
   */
  public function getExpiry(): ?\DateTimeImmutable {
    $value = $this->expiry->value ?? NULL;
    if (!is_numeric($value)) {
      return NULL;
    }

    return new \DateTimeImmutable('@' . $value);
  }

  /**
   * {@inheritdoc}
   */
  public function setExpiry(\DateTimeInterface $expiry) {
    return $this->set('expiry', $expiry->getTimestamp());
  }

  /**
   * {@inheritdoc}
   */
  public static function baseFieldDefinitions(EntityTypeInterface $entity_type) {
    $fields = parent::baseFieldDefinitions($entity_type);
    $fields['token'] = BaseFieldDefinition::create('string')
      ->setLabel(t('Preview Token'))
      ->setDescription(t('A token that allows any user to view a preview of this entity.'))
      ->setRequired(TRUE);

    $fields['entities'] = BaseFieldDefinition::create('dynamic_entity_reference')
      ->setLabel(t('Entities'))
      ->setDescription(t('The associated entities this preview link unlocks.'))
      ->setRequired(TRUE)
      ->setCardinality(FieldStorageDefinitionInterface::CARDINALITY_UNLIMITED)
      ->addConstraint('SilverbackPreviewLinkEntitiesUniqueConstraint', [])
      ->setSettings(static::entitiesDefaultFieldSettings())
      ->setDisplayOptions('form', [
        'type' => 'silverback_preview_link_entities_widget',
        'weight' => 10,
      ]);

    $fields['generated_timestamp'] = BaseFieldDefinition::create('timestamp')
      ->setLabel(t('Generated Timestamp'))
      ->setDescription(t('The time the link was generated'))
      ->setRequired(TRUE);

    $fields['expiry'] = BaseFieldDefinition::create('timestamp')
      ->setLabel(t('Time this Preview Link expires.'))
      ->setDescription(t('The time after which the preview link is no longer valid.'))
      ->setDefaultValueCallback(static::class . '::expiryDefaultValue')
      ->setRequired(TRUE);

    return $fields;
  }

  /**
   * Rewrites settings for 'entities' dynamic_entity_reference field.
   *
   * DynamicEntityReferenceItem::defaultFieldSettings doesn't receive any context,
   * so we need to change the default handlers manually.
   */
  public static function entitiesDefaultFieldSettings(): array {
    $labels = \Drupal::service('entity_type.repository')->getEntityTypeLabels(TRUE);
    $options = $labels[(string) t('Content', [], ['context' => 'Entity type group'])];
    $settings = [
      'exclude_entity_types' => TRUE,
      'entity_type_ids' => [],
    ];
    $settings += array_fill_keys(array_keys($options), [
      'handler' => 'silverback_preview_link',
      'handler_settings' => [],
    ]);
    return $settings;
  }

  /**
   * Get default value for 'expiry' field.
   *
   * @return int<0, max>
   *   A timestamp.
   */
  public static function expiryDefaultValue(): int {
    $time = \Drupal::time();
    /** @var \Drupal\silverback_preview_link\PreviewLinkExpiry $linkExpiry */
    $linkExpiry = \Drupal::service('silverback_preview_link.link_expiry');
    return max(0, $time->getRequestTime() + $linkExpiry->getLifetime());
  }

}
