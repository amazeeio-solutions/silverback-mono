<?php

namespace Drupal\silverback_preview_link\Controller;

use Drupal\Core\Cache\CacheableResponse;
use Drupal\Core\Controller\ControllerBase;
use Drupal\silverback_preview_link\QRCodeWithLogo;
use Drupal\user\Entity\User;
use Symfony\Component\HttpFoundation\JsonResponse;

class PreviewController extends ControllerBase {

  /**
   * Checks if the current user has access to the Preview app.
   */
  public function hasAccess() {
    /** @var \Drupal\Core\Session\AccountProxyInterface $userAccount */
    $userAccount = $this->currentUser();
    // Verify permission against User entity.
    $userEntity = User::load($userAccount->id());
    if ($userEntity->hasPermission('use external preview')) {
      return new JsonResponse([
        'access' => TRUE,
      ], 200);
    }
    else {
      return new JsonResponse([
        'access' => FALSE,
      ], 403);
    }
  }

  /**
   * Skip Drupal authentication if there is a valid preview token.
   *
   * @todo: previously, this method used to also check if the preview access
   * token has been attached to an entity (the entity type and entity ids were
   * sent as parameters). This approach will change in the future (as part of a
   * bigger refactoring) where preview links won't be attached to content
   * entities anymore, so this method might change again.
   */
  public function hasLinkAccess() {
    $requestContent = \Drupal::request()->getContent();
    $body = json_decode($requestContent, TRUE);
    if (!empty($body['preview_access_token'])) {
      try {
        $storage = \Drupal::entityTypeManager()->getStorage('silverback_preview_link');
        $previewLink = $storage->loadByProperties(['token' => $body['preview_access_token']]);
        if (empty($previewLink)) {
          return new JsonResponse([
            'access' => FALSE,
          ], 403);
        }

        // @todo: optionally, we could also check if the link has expired.
        // Expired links should be, however, deleted by the cron job. As this
        // part of the code will probably suffer modifications during the next
        // bigger refactoring (see the todo in the method's description), we
        // will just check for now if the link simply exists.
        return new JsonResponse([
          'access' => TRUE,
        ], 200);
      }
      catch (\Exception $e) {
        $this->getLogger('silverback_preview_link')->error($e->getMessage());
      }
    }
    return new JsonResponse([
      'access' => FALSE,
    ], 403);
  }

  /**
   * Returns the QR SVG file.
   */
  public function getQRCode(string $base64_url): CacheableResponse {
    $decodedUrl = base64_decode(str_replace(['_'], ['/'], $base64_url));
    $qrCode = new QRCodeWithLogo();
    $result = $qrCode->getQRCode($decodedUrl);
    return new CacheableResponse($result, 200, ['Content-Type' => 'image/svg+xml']);
  }

}
