<?php

namespace Drupal\silverback_image_ai\Plugin\Action;

use Drupal\Core\Access\AccessResult;
use Drupal\Core\Action\ActionBase;
use Drupal\Core\Action\Attribute\Action;
use Drupal\Core\Action\Plugin\Action\Derivative\EntityPublishedActionDeriver;
use Drupal\Core\Session\AccountInterface;
use Drupal\Core\StringTranslation\TranslatableMarkup;

/**
 * Update ALT text for media images.
 */
#[Action(
  id: 'entity:alt_ai_update_action',
  action_label: new TranslatableMarkup('Alt text update (AI)'),
  deriver: EntityPublishedActionDeriver::class
)]
class AltAiUpdateAction extends ActionBase {

  private const BUNDLE_IMAGE = 'image';
  private const DEFAULT_LANGCODE = 'en';

  /**
   * {@inheritdoc}
   */
  public function execute($entity = NULL) {
    // @todo Add DI
    if ($entity->bundle() == self::BUNDLE_IMAGE) {
      $langcode = $entity->langcode->value ?? self::DEFAULT_LANGCODE;
      $service = \Drupal::service('silverback_image_ai.utilities');
      $file = $entity->field_media_image->entity;
      if ($file) {
        $alt_text = $service->generateImageAlt($file, $langcode);
        if (!empty($alt_text)) {
          $service->setMediaImageAltText($entity, $alt_text);
        }
      }
    }
  }

  /**
   * {@inheritdoc}
   */
  public function access($object, ?AccountInterface $account = NULL, $return_as_object = FALSE) {
    $result = AccessResult::allowedIfHasPermission($account, 'create media');
    return $return_as_object ? $result : $result->isAllowed();
  }

}
