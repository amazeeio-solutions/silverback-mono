<?php

declare(strict_types = 1);

namespace Drupal\silverback_preview_link;

use Drupal\Component\Datetime\TimeInterface;
use Drupal\Core\DependencyInjection\ContainerInjectionInterface;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * Drupal hooks.
 */
class PreviewLinkHooks implements ContainerInjectionInterface {

  /**
   * PreviewLinkHooks constructor.
   */
  final public function __construct(
    protected PreviewLinkStorageInterface $previewLinkStorage,
    protected TimeInterface $time,
  ) {
  }

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container) {
    /** @var \Drupal\silverback_preview_link\PreviewLinkStorageInterface $storage */
    $storage = $container->get('entity_type.manager')->getStorage('silverback_preview_link');
    return new static(
      $storage,
      $container->get('datetime.time'),
    );
  }

  /**
   * Implements hook_cron().
   *
   * Cleans up expired Preview Links.
   *
   * @see \preview_link_cron()
   */
  public function cron(): void {
    $ids = $this->previewLinkStorage->getQuery()
      ->accessCheck(FALSE)
      ->condition('expiry', $this->time->getRequestTime(), '<')
      ->execute();

    // If there are no expired links then nothing to do.
    if (count($ids) === 0) {
      return;
    }

    $previewLinks = $this->previewLinkStorage->loadMultiple($ids);
    // Simply delete the preview links. A new one will be regenerated at a later
    // date as required.
    $this->previewLinkStorage->delete($previewLinks);
  }

}
