<?php

declare(strict_types = 1);

namespace Drupal\silverback_preview_link\Form;

use Drupal\Core\Config\ConfigFactoryInterface;
use Drupal\Core\Entity\EntityTypeBundleInfoInterface;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Form\ConfigFormBase;
use Drupal\Core\Form\FormStateInterface;
use Drupal\silverback_preview_link\PreviewLinkUtility;
use Drupal\user\Entity\User;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * Allow settings to be changed from the UI for Silverback preview link.
 */
class SettingsForm extends ConfigFormBase {

  /**
   * Constructs a SettingsForm.
   */
  public function __construct(ConfigFactoryInterface $configFactory,
    protected EntityTypeBundleInfoInterface $bundleInfo,
    protected EntityTypeManagerInterface $entityTypeManager,
  ) {
    parent::__construct($configFactory);
  }

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container) {
    return new static(
      $container->get('config.factory'),
      $container->get('entity_type.bundle.info'),
      $container->get('entity_type.manager'),
    );
  }

  /**
   * {@inheritdoc}
   */
  protected function getEditableConfigNames(): array {
    return [
      $this->getConfigName(),
    ];
  }

  /**
   * A method to get the config name.
   *
   * @return string
   *   The config name.
   */
  private function getConfigName(): string {
    return 'silverback_preview_link.settings';
  }

  /**
   * {@inheritdoc}
   */
  public function getFormId(): string {
    return 'silverback_preview_link_settings_form';
  }

  /**
   * {@inheritdoc}
   */
  public function buildForm(array $form, FormStateInterface $form_state): array {
    $config = $this->config($this->getConfigName());
    $form = parent::buildForm($form, $form_state);

    $form['bundles'] = [
      '#type' => 'details',
    ];
    $form['bundles']['help'] = [
      '#markup' => $this->t('Enable entity type/bundles for use with preview link.'),
    ];
    $selectedOptions = $this->getSelectedEntityTypeOptions();
    $form['bundles']['enabled_entity_types'] = [
      '#type' => 'tableselect',
      '#header' => [
        $this->t('Entity type'),
        $this->t('Bundle'),
      ],
      '#options' => $this->getEntityTypeOptions(),
      '#default_value' => array_fill_keys($selectedOptions, TRUE),
    ];
    // Collapse the details element if anything is enabled.
    $form['bundles']['#title'] = $this->t('Enabled types (@count)', [
      '@count' => count($selectedOptions),
    ]);
    $form['bundles']['#open'] = count($selectedOptions) === 0;

    $form['multiple_entities'] = [
      '#type' => 'checkbox',
      '#title' => 'Multiple entities',
      '#description' => $this->t('Whether preview links can reference multiple entities.'),
      '#default_value' => $config->get('multiple_entities'),
    ];
    $form['expiry_seconds'] = [
      '#type' => 'number',
      '#title' => 'Expiry seconds',
      '#description' => $this->t('The number of seconds before a preview link expires.'),
      '#default_value' => $config->get('expiry_seconds') ?: 604800,
      '#min' => 1,
    ];
    $preview_user_id = $config->get('default_preview_user');
    $form['default_preview_user'] = [
      '#type' => 'entity_autocomplete',
      '#target_type' => 'user',
      '#default_value' => $preview_user_id ? User::load($preview_user_id) : NULL,
      '#selection_settings' => ['include_anonymous' => FALSE],
      '#title' => $this->t('Default preview user'),
      '#description' => $this->t('Attach a default user to all the preview links. By choosing an user, when the preview link will be accessed, the request will be authenticated using that user.'),
    ];

    return $form;
  }

  /**
   * {@inheritdoc}
   */
  public function submitForm(array &$form, FormStateInterface $form_state) {
    $config = $this->config($this->getConfigName());

    $config->set('multiple_entities', $form_state->getValue('multiple_entities'));
    $config->set('expiry_seconds', $form_state->getValue('expiry_seconds'));
    $config->set('default_preview_user', $form_state->getValue('default_preview_user'));

    $config->clear('enabled_entity_types');
    foreach (array_keys(array_filter($form_state->getValue('enabled_entity_types'))) as $enabledBundle) {
      if (strpos($enabledBundle, ':') !== FALSE) {
        [$entityTypeId, $bundle] = explode(':', $enabledBundle);
        $bundles = $config->get('enabled_entity_types.' . $entityTypeId) ?: [];
        $bundles[] = $bundle;
        $config->set('enabled_entity_types.' . $entityTypeId, $bundles);
      }
      else {
        $entityTypeId = $enabledBundle;
        $config->set('enabled_entity_types.' . $entityTypeId, []);
      }
    }

    $config->save();
    parent::submitForm($form, $form_state);
  }

  /**
   * The options available for the user to select for bundle types.
   *
   * @return array
   *   A 'entity_id:bundle' style array of possible options.
   */
  protected function getEntityTypeOptions(): array {
    $options = [];
    $entityTypes = $this->entityTypeManager->getDefinitions();
    $entityTypes = array_filter($entityTypes, [
      PreviewLinkUtility::class,
      'isEntityTypeSupported',
    ]);
    foreach ($entityTypes as $entityTypeId => $info) {
      $options[$entityTypeId] = [
        ['data' => ['#markup' => '<strong>' . $info->getLabel() . '</strong>']],
        ['data' => ['#markup' => $this->t('<em>If selected and no bundles are selected, all bundles will be enabled.</em>')]],
      ];
      foreach ($this->bundleInfo->getBundleInfo($entityTypeId) as $bundle => $bundleInfo) {
        if ($entityTypeId === $bundle) {
          continue;
        }
        $options[sprintf('%s:%s', $entityTypeId, $bundle)] = [
          $info->getLabel() ?: '',
          $bundleInfo['label'] ?: '',
        ];
      }
    }
    return $options;
  }

  /**
   * The enabled entities and bundles for preview link to apply to.
   *
   * @return array
   *   A 'entity_id:bundle' style array of selected options.
   */
  protected function getSelectedEntityTypeOptions(): array {
    $config = $this->config($this->getConfigName());
    $configured = $config->get('enabled_entity_types') ?: [];
    $selected = [];
    foreach ($configured as $entityTypeId => $bundles) {
      $selected[] = $entityTypeId;
      foreach ($bundles as $bundle) {
        $selected[] = sprintf('%s:%s', $entityTypeId, $bundle);
      }
    }
    return $selected;
  }

}
