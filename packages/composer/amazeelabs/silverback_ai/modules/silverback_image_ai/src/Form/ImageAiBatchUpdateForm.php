<?php

declare(strict_types=1);

namespace Drupal\silverback_image_ai\Form;

use Drupal\Component\Plugin\Exception\InvalidPluginDefinitionException;
use Drupal\Component\Plugin\Exception\PluginNotFoundException;
use Drupal\Core\Form\FormBase;
use Drupal\Core\Form\FormStateInterface;
use Drupal\Core\Messenger\MessengerInterface;
use Drupal\silverback_image_ai\ImageAiUtilities;
use Drupal\silverback_image_ai\MediaUpdaterBatch;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * Provides a Silverback Alt AI form.
 */
final class ImageAiBatchUpdateForm extends FormBase {

  /**
   * {@inheritdoc}
   */
  public function getFormId(): string {
    return 'silverback_image_ai_image_ai_batch_update';
  }

  /**
   * The messenger.
   *
   * @var \Drupal\Core\Messenger\MessengerInterface
   */
  protected $messenger;

  /**
   * The batch service.
   *
   * @var \Drupal\silverback_image_ai\MediaUpdaterBatch
   */
  protected $batch;

  /**
   * The batch service.
   *
   * @var \Drupal\silverback_image_ai\ImageAiUtilities
   */
  protected $service;

  /**
   * Constructor.
   *
   * @param \Drupal\Core\Messenger\MessengerInterface $messenger
   *   The messenger.
   * @param \Drupal\silverback_image_ai\MediaUpdaterBatch $batch
   *   THe batch service.
   * @param \Drupal\silverback_image_ai\ImageAiUtilities $service
   *   THe batch service.
   */
  public function __construct(MessengerInterface $messenger, MediaUpdaterBatch $batch, ImageAiUtilities $service) {
    $this->messenger = $messenger;
    $this->batch = $batch;
    $this->service = $service;
  }

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container) {
    return new static(
          $container->get('messenger'),
          $container->get('silverback_image_ai.batch.updater'),
          $container->get('silverback_image_ai.utilities'),
      );
  }

  /**
   * {@inheritdoc}
   */
  public function buildForm(array $form, FormStateInterface $form_state): array {

    $form['description'] = [
      '#markup' => '<p>This form will run batch processing.</p>',
    ];

    $form['batch_container'] = [
      '#type' => 'details',
      '#title' => $this->t('Media imaged ALT text batch update'),
      '#open' => TRUE,
    ];

    // $form['batch_missing_only']['actions']['#type'] = 'actions';
    $missing_alt_count = $this->service->getMediaEntitiesToUpdateWithAlt();
    $media_images_count = $this->service->getMediaEntitiesToUpdateAll();

    $form['batch_container']['info'] = [
      '#type' => 'markup',
      '#markup' => $this->t('There are <strong><em>@count/@total</em></strong> media images with missing alt text.', [
        '@count' => count($missing_alt_count),
        '@total' => count($media_images_count),
      ]),
    ];

    $form['batch_container']['selection'] = [
      '#type' => 'radios',
      '#title' => $this->t('Select what to update'),
      '#default_value' => 1,
      '#options' => [
        1 => $this->t('Update only media images with missing ALT text'),
        2 => $this->t('Update all media images'),
      ],
    ];

    $form['batch_container']['confirm'] = [
      '#title' => $this->t('⚠️ I understand that this action will overwrite all existing ALT texts and I want to proceed.'),
      '#type' => 'checkbox',
      '#states' => [
        'visible' => [
          [
            ':input[name="selection"]' => ['value' => 2],
          ],
        ],
      ],
    ];

    $form['batch_container']['actions']['submit_all'] = [
      '#type' => 'submit',
      '#value' => $this->t('Run update process'),
      '#button_type' => 'primary',
      '#states' => [
        'disabled' => [
          [
            ':input[name="confirm"]' => ['checked' => FALSE],
          ],
        ],
      ],
    ];

    return $form;
  }

  /**
   * {@inheritdoc}
   */
  public function validateForm(array &$form, FormStateInterface $form_state): void {
    // ..
  }

  /**
   * {@inheritdoc}
   */
  public function submitForm(array &$form, FormStateInterface $form_state): void {
    // @todo Create a method for this
    try {
      $media_entities = $this->service->getMediaEntitiesToUpdateAll();
      $this->batch->create($media_entities);
    }
    catch (InvalidPluginDefinitionException | PluginNotFoundException $e) {
      // @todo
    }
  }

}
