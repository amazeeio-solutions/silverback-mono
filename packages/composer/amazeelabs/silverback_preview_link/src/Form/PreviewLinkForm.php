<?php

declare(strict_types = 1);

namespace Drupal\silverback_preview_link\Form;

use chillerlan\QRCode\QRCode;
use chillerlan\QRCode\QROptions;
use Drupal\Component\Datetime\TimeInterface;
use Drupal\Component\Utility\Html;
use Drupal\Component\Utility\NestedArray;
use Drupal\Core\Ajax\AjaxResponse;
use Drupal\Core\Ajax\PrependCommand;
use Drupal\Core\Ajax\ReplaceCommand;
use Drupal\Core\Datetime\DateFormatterInterface;
use Drupal\Core\Entity\ContentEntityForm;
use Drupal\Core\Entity\EntityInterface;
use Drupal\Core\Entity\EntityRepositoryInterface;
use Drupal\Core\Entity\EntityTypeBundleInfoInterface;
use Drupal\Core\Form\FormStateInterface;
use Drupal\Core\Messenger\MessengerInterface;
use Drupal\Core\Routing\RouteMatchInterface;
use Drupal\Core\Url;
use Drupal\node\NodeInterface;
use Drupal\silverback_preview_link\Entity\SilverbackPreviewLink;
use Drupal\silverback_preview_link\PreviewLinkExpiry;
use Drupal\silverback_preview_link\PreviewLinkHostInterface;
use Drupal\silverback_preview_link\PreviewLinkStorageInterface;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Drupal\silverback_preview_link\QRCodeLogo;
use Drupal\silverback_preview_link\QRCodeWithLogo;

/**
 * Preview link form.
 *
 * @internal
 *
 * @property \Drupal\silverback_preview_link\Entity\SilverbackPreviewLinkInterface $entity
 */
final class PreviewLinkForm extends ContentEntityForm {

  /**
   * PreviewLinkForm constructor.
   */
  public function __construct(
    EntityRepositoryInterface $entity_repository,
    EntityTypeBundleInfoInterface $entity_type_bundle_info,
    TimeInterface $time,
    protected DateFormatterInterface $dateFormatter,
    protected PreviewLinkExpiry $linkExpiry,
    MessengerInterface $messenger,
    protected PreviewLinkHostInterface $previewLinkHost,
  ) {
    parent::__construct($entity_repository, $entity_type_bundle_info, $time);
    $this->messenger = $messenger;
  }

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container): self {
    return new static(
      $container->get('entity.repository'),
      $container->get('entity_type.bundle.info'),
      $container->get('datetime.time'),
      $container->get('date.formatter'),
      $container->get('silverback_preview_link.link_expiry'),
      $container->get('messenger'),
      $container->get('silverback_preview_link.host'),
    );
  }

  /**
   * {@inheritdoc}
   */
  public function getFormId() {
    return 'silverback_preview_link_entity_form';
  }

  /**
   * {@inheritdoc}
   */
  public function getEntityFromRouteMatch(RouteMatchInterface $route_match, $entity_type_id) {
    $host = $this->getHostEntity($route_match);
    $previewLinks = $this->previewLinkHost->getPreviewLinks($host);
    if (count($previewLinks) > 0) {
      return reset($previewLinks);
    }
    else {
      $storage = $this->entityTypeManager->getStorage('silverback_preview_link');
      assert($storage instanceof PreviewLinkStorageInterface);
      $previewLink = SilverbackPreviewLink::create()->addEntity($host);
      $previewLink->save();
      return $previewLink;
    }
  }

  /**
   * Get the entity referencing this Preview Link.
   *
   * @param \Drupal\Core\Routing\RouteMatchInterface $routeMatch
   *   A route match.
   *
   * @return \Drupal\Core\Entity\EntityInterface
   *   The host entity.
   */
  public function getHostEntity(RouteMatchInterface $routeMatch): EntityInterface {
    return parent::getEntityFromRouteMatch($routeMatch, $routeMatch->getRouteObject()->getOption('silverback_preview_link.entity_type_id'));
  }

  /**
   * {@inheritdoc}
   */
  public function buildForm(array $form, FormStateInterface $form_state, RouteMatchInterface $routeMatch = NULL) {
    if (!isset($routeMatch)) {
      throw new \LogicException('Route match not populated from argument resolver');
    }

    $host = $this->getHostEntity($routeMatch);
    $form = parent::buildForm($form, $form_state);
    // See https://www.drupal.org/project/drupal/issues/2897377
    $form['#id'] = Html::getId($form_state->getBuildInfo()['form_id']);

    if ($host instanceof NodeInterface) {
      /** @var \Drupal\silverback_preview_link\Entity\SilverbackPreviewLinkInterface $silverbackPreviewLink */
      $silverbackPreviewLink = $this->getEntity();
      /** @var \Drupal\silverback_external_preview\ExternalPreviewLink $externalPreviewLink */
      $externalPreviewLink = \Drupal::service('silverback_external_preview.external_preview_link');
      $externalPreviewUrl = $externalPreviewLink->createPreviewUrlFromEntity($host);
      $query = $externalPreviewUrl->getOption('query') ?? [];
      $query['preview_access_token'] = $silverbackPreviewLink->getToken();
      $externalPreviewUrl->setOption('query', $query);
      $externalPreviewUrlString = $externalPreviewUrl->setAbsolute()->toString();
    }
    else {
      \Drupal::messenger()->addError('Preview link is only available for nodes.');
      // This could be refactored to get the storage.
      // Implement nodes for now as we are still using Drupal Gutenberg 2.x that
      // is not entity type agnostic.
      // $link = Url::fromRoute('entity.' . $host->getEntityTypeId() . '.silverback_preview_link', [
      //   $host->getEntityTypeId() => $host->id(),
      //   'preview_token' => $previewLink->getToken(),
      // ]);
      return $form;
    }

    $originalAgeFormatted = $this->dateFormatter->formatInterval($this->linkExpiry->getLifetime(), 1);
    $remainingSeconds = max(0, ($this->entity->getExpiry()?->getTimestamp() ?? 0) - $this->time->getRequestTime());
    $remainingAgeFormatted = $this->dateFormatter->formatInterval($remainingSeconds);
    $isNewToken = $this->linkExpiry->getLifetime() === $remainingSeconds;
    $displayQRCode = TRUE;
    $qrFallback = NULL;
    $qrCodeUrlString = NULL;
    $actionsDescription = NULL;
    $previewLinkHasExpired = $remainingSeconds === 0;
    $displayGif = \Drupal::state()->get('silverback_easter_mode') === '↑↑↓↓←→←→BA';

    if ($isNewToken) {
      $expiryDescription = $this->t('Expires @lifetime after creation.', [
        '@lifetime' => $originalAgeFormatted,
      ]);
      $qrCode = (new QRCode)->render($externalPreviewUrlString);
    }
    else {
      if ($previewLinkHasExpired) {
        $expiryDescription = $this->t('⌛ <strong>Live preview link</a> for <em>@entity_label</em> has expired</strong>, reset link expiry or generate a new one.', [
          ':url' => $externalPreviewUrlString,
          '@entity_label' => $host->label(),
        ]);
        $displayQRCode = FALSE;
      }
      else {
        $expiryDescription = $this->t('Live preview link for <em>@entity_label</em> expires in @lifetime.</p>', [
          ':url' => $externalPreviewUrlString,
          '@entity_label' => $host->label(),
          '@lifetime' => $remainingAgeFormatted,
        ]);
      }
      $actionsDescription = $this->t('If a new link is generated, the active link becomes invalid.');
    }

    if ($displayQRCode) {
      $qrCodeEncodedUrl = str_replace(['/'], ['_'], base64_encode($externalPreviewUrlString));
      try {
        $qrCodeUrlString = Url::fromRoute('silverback_preview_link.qr_code', ['base64_url' => $qrCodeEncodedUrl])->toString();
      }
      catch (\Exception $e) {
        $this->logger('silverback_preview_link')->error('Failed to generate branded QR code: @message', ['@message' => $e->getMessage()]);
        try {
          $qrFallback = (new QRCode)->render($externalPreviewUrlString);
        }
        catch (\Exception $e) {
          $this->logger('silverback_preview_link')->error('Failed to generate fallback QR code: @message', ['@message' => $e->getMessage()]);
        }
      }
    }

    $form['preview_link'] = [
      '#theme' => 'preview_link',
      '#title' => $this->t('Preview link'),
      '#weight' => -9999,
      '#preview_link_has_expired' => $previewLinkHasExpired,
      '#preview_url' => $externalPreviewUrlString,
      '#preview_qr_code_url' => $qrCodeUrlString,
      '#preview_qr_code_fallback' => $qrFallback,
      '#expiry_description' => $expiryDescription,
      '#actions_description' => $actionsDescription,
      '#display_gif' => $displayGif,
    ];

    if (!$isNewToken) {
      $form['actions']['regenerate_submit'] = $form['actions']['submit'];
      $form['actions']['regenerate_submit']['#value'] = $this->t('Generate new link');
      // Shift ::save to after ::regenerateToken.
      $form['actions']['regenerate_submit']['#submit'] = array_diff($form['actions']['regenerate_submit']['#submit'], ['::save']);
      $form['actions']['regenerate_submit']['#submit'][] = '::regenerateToken';
      $form['actions']['regenerate_submit']['#submit'][] = '::save';
      $form['actions']['regenerate_submit']['#ajax'] = [
        'callback' => [get_called_class(), 'ajaxRefreshForm'],
      ];

      $form['actions']['reset'] = [
        '#type' => 'submit',
        '#value' => $this->t('Reset current link expiry to @lifetime', ['@lifetime' => $originalAgeFormatted]),
        '#submit' => ['::resetLifetime', '::save'],
        '#ajax' => [
          'callback' => [get_called_class(), 'ajaxRefreshForm'],
        ],
        '#weight' => 100,
      ];
    }
    unset($form['actions']['submit']);
    $form['#attached']['library'][] = 'silverback_preview_link/copy';
    $form['#attached']['library'][] = 'silverback_preview_link/modal';

    return $form;
  }

  public static function ajaxRefreshForm(array $form, FormStateInterface $form_state) {
    $triggering_element = $form_state->getTriggeringElement();
    $element = NULL;
    if (!empty($triggering_element['#ajax']['element'])) {
      $element = NestedArray::getValue($form, $triggering_element['#ajax']['element']);
    }
    // Element not specified or not found. Show messages on top of the form.
    if (!$element) {
      $element = $form;
    }
    $response = new AjaxResponse();
    $response->addCommand(new ReplaceCommand('[data-drupal-selector="' . $form['#attributes']['data-drupal-selector'] . '"]', $form));
    $response->addCommand(new PrependCommand('[data-drupal-selector="' . $element['#attributes']['data-drupal-selector'] . '"]', ['#type' => 'status_messages']));

    return $response;
  }

  /**
   * {@inheritdoc}
   */
  public function submitForm(array &$form, FormStateInterface $form_state) {
    // For ajax.
    $form_state->setRebuild();
    parent::submitForm($form, $form_state);
    // Update the changed timestamp of the entity.
    $this->updateChangedTime($this->entity);
  }

  /**
   * {@inheritdoc}
   */
  public function save(array $form, FormStateInterface $form_state) {
    $result = parent::save($form, $form_state);
    return $result;
  }

  /**
   * Regenerates preview link token.
   *
   * @param array $form
   *   An associative array containing the structure of the form.
   * @param \Drupal\Core\Form\FormStateInterface $form_state
   *   The current state of the form.
   */
  public function regenerateToken(array &$form, FormStateInterface $form_state): void {
    $this->entity->regenerateToken(TRUE);
    $expiry = $this->getExpiry();
    $this->entity->setExpiry($expiry);
    $this->messenger()->addMessage($this->t('The live preview link token has been regenerated.'));
  }

  /**
   * Resets the lifetime of the preview link.
   *
   * @param array $form
   *   An associative array containing the structure of the form.
   * @param \Drupal\Core\Form\FormStateInterface $form_state
   *   The current state of the form.
   */
  public function resetLifetime(array &$form, FormStateInterface $form_state): void {
    $form_state->setRebuild();
    $expiry = $this->getExpiry();
    $this->entity->setExpiry($expiry);
    $timezone = date_default_timezone_get();
    $this->messenger()->addMessage($this->t('Preview link will now expire at %time.', [
      '%time' => $this->dateFormatter->format($expiry->getTimestamp(), 'custom', 'd/m/y H:i', $timezone) . ' (' . $timezone . ')',
    ]));
  }

  /**
   * Helper to reset the expiry.
   *
   * @return \DateTimeImmutable|false
   *
   * @throws \Exception
   */
  private function getExpiry() {
    $expiry = new \DateTimeImmutable('@' . $this->time->getRequestTime());
    return $expiry->modify('+' . $this->linkExpiry->getLifetime() . ' seconds');
  }

}
