<?php

declare(strict_types=1);

namespace Drupal\silverback_ai\Form;

use Drupal\Core\Form\ConfigFormBase;
use Drupal\Core\Form\FormStateInterface;

/**
 * Configure Silverback Alt AI settings for this site.
 */
final class SilverbackAiSettingsForm extends ConfigFormBase {

  /**
   * {@inheritdoc}
   */
  public function getFormId(): string {
    return 'silverback_ai_settings';
  }

  /**
   * {@inheritdoc}
   */
  protected function getEditableConfigNames(): array {
    return ['silverback_ai.settings'];
  }

  /**
   * {@inheritdoc}
   */
  public function buildForm(array $form, FormStateInterface $form_state): array {

    $form['credentials'] = [
      '#type' => 'details',
      '#title' => $this->t('Open AI credentials'),
      '#open' => TRUE,
    ];

    $form['credentials']['open_ai_base_uri'] = [
      '#type' => 'textfield',
      '#title' => $this->t('Base URI'),
      '#default_value' => $this->t('https://api.openai.com/v1/'),
      '#description' => $this->t("The OPEN AI API endpoint.") ,
    ];

    // Try to fetch ket from open ai module.
    $api_key = $this->config('openai.settings')->get('api_key');
    $api_org = $this->config('openai.settings')->get('api_org');

    $form['credentials']['open_ai_key'] = [
      '#type' => 'password',
      '#title' => $this->t('Open AI key'),
      '#description' => $this->t("The OPEN AI key for this project.") . '<br />' .
      $this->t('Install the <strong><a href="@href" target="_blank">Open AI</a></strong> module to use the defined key from the module settings.', [
        '@href' => 'https://www.drupal.org/project/openai',
      ]),
      '#default_value' => $this->config('silverback_ai.settings')->get('open_ai_api_key'),
    ];

    return parent::buildForm($form, $form_state);
  }

  /**
   * {@inheritdoc}
   */
  public function validateForm(array &$form, FormStateInterface $form_state): void {
    parent::validateForm($form, $form_state);
  }

  /**
   * {@inheritdoc}
   */
  public function submitForm(array &$form, FormStateInterface $form_state): void {
    $this->config('silverback_ai.settings')
      ->set('open_ai_base_uri', $form_state->getValue('open_ai_base_uri'))
      ->set('open_ai_api_key', $form_state->getValue('open_ai_api_key'))
      ->save();
    parent::submitForm($form, $form_state);
  }

}
