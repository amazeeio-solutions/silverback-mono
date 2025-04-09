<?php

namespace Drupal\silverback_preview_link\Authentication\Provider;

use Drupal\Core\Authentication\AuthenticationProviderInterface;
use Drupal\Core\PageCache\ResponsePolicy\KillSwitch;
use Drupal\Core\Session\AccountInterface;
use Drupal\silverback_preview_link\PreviewLinkExpiry;
use Drupal\silverback_preview_link\PreviewLinkStorageInterface;
use Symfony\Component\HttpFoundation\Request;

/**
 * Authentication provider based on a token from a preview link.
 */
class PreviewToken implements AuthenticationProviderInterface {

  /**
   * The preview link storage service.
   *
   * @var \Drupal\silverback_preview_link\PreviewLinkStorageInterface
   */
  protected PreviewLinkStorageInterface $previewLinkStorage;

  /**
   * The page cache kill switch service.
   *
   * @var \Drupal\Core\PageCache\ResponsePolicy\KillSwitch
   */
  protected KillSwitch $killSwitch;

  /**
   * The preview link expiry service.
   * @var PreviewLinkExpiry
   */
  protected PreviewLinkExpiry $previewLinkExpiry;

  /**
   * Constructs a new token authentication provider.
   */
  public function __construct() {
    // If we inject the entity entity type manager service, we get a circular
    // dependency error, that is why we access the entity type manager service
    // from here.
    /** @var \Drupal\silverback_preview_link\PreviewLinkStorageInterface $storage */
    $storage = \Drupal::entityTypeManager()->getStorage('silverback_preview_link');
    $this->previewLinkStorage = $storage;
    $this->killSwitch = \Drupal::service('page_cache_kill_switch');
    $this->previewLinkExpiry = \Drupal::service('silverback_preview_link.link_expiry');
  }

  /**
   * {@inheritdoc}
   */
  public function applies(Request $request) {
    $previewToken = $this->getPreviewTokenFromRequest($request);
    return !empty($previewToken);
  }

  /**
   * {@inheritdoc}
   */
  public function authenticate(Request $request) {
    // If we authenticate the user with a token, we do not want to cache the
    // page.
    $this->killSwitch->trigger();
    $previewToken = $this->getPreviewTokenFromRequest($request);
    return $this->getUserFromPreviewToken($previewToken);
  }

  /**
   * Returns a preview token from the request (the preview_access_token query
   * parameter).
   *
   * @param \Symfony\Component\HttpFoundation\Request $request
   * @return bool|float|int|string|null
   */
  protected function getPreviewTokenFromRequest(Request $request) {
    return $request->query->get('preview_access_token');
  }

  /**
   * Returns the User object for a given preview token.
   *
   * The preview link entity which corresponds to the token will be loaded and
   * if there is a user associated with that token it will be returned.
   *
   * @param string $previewToken
   *   The preview token.
   *
   * @return \Drupal\Core\Session\AccountInterface|null
   *   The User object for the current user, or NULL for anonymous.
   */
  protected function getUserFromPreviewToken(string $previewToken): AccountInterface|null {
    $previewLink = $this->previewLinkStorage->loadByProperties(['token' => $previewToken]);
    if (empty($previewLink)) {
      return NULL;
    }
    // The loadByProperties() method returns the result as an array, so just
    // take the first element.
    $previewLink = reset($previewLink);
    $referencedEntities = $previewLink->get('entities')->referencedEntities();
    if (empty($referencedEntities)) {
      return NULL;
    }
    $referencedUser = array_reduce($referencedEntities, function ($carry, $entity) {
      if ($entity->getEntityTypeId() === 'user' && $entity->isActive()) {
        $carry = $entity;
      }
      return $carry;
    }, NULL);
    // No active user entity reference found for the preview link, just return
    // NULL.
    if (empty($referencedUser)) {
      return NULL;
    }
    return $referencedUser;
  }
}
