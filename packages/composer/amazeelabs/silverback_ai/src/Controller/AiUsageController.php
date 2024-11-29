<?php

declare(strict_types=1);

namespace Drupal\silverback_ai\Controller;

use Drupal\Core\Controller\ControllerBase;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Session\AccountProxyInterface;
use Drupal\Core\StringTranslation\StringTranslationTrait;
use Drupal\silverback_ai\TokenUsageInterface;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * Returns responses for Silverback AI routes.
 */
class AiUsageController extends ControllerBase {

  use StringTranslationTrait;

  /**
   * The entity type manager service.
   *
   * @var \Drupal\Core\Entity\EntityTypeManagerInterface
   */
  protected $entityTypeManager;

  /**
   * The token usage service.
   *
   * @var \Drupal\silverback_ai\TokenUsage
   */
  protected $silverbackAiTokenUsage;

  /**
   * The account object.
   *
   * @var \Drupal\Core\Session\AccountInterface
   */
  protected $currentUser;

  /**
   * The controller constructor.
   */
  public function __construct(
    EntityTypeManagerInterface $entityTypeManager,
    TokenUsageInterface $silverbackAiTokenUsage,
    AccountProxyInterface $currentUser,
  ) {}

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container): self {
    return new self(
      $container->get('entity_type.manager'),
      $container->get('silverback_ai.token.usage'),
      $container->get('current_user'),
    );
  }

  /**
   * Builds the response.
   */
  public function __invoke(): array {

    $header = [
      'timestamp' => $this->t('Timestamp'),
      'username' => $this->t('User'),
      'entity_id' => $this->t('Entity type'),
      'tokens_total' => $this->t('Tokens used'),
      'ai_provider' => $this->t('Provider / Model'),
      'module_name' => $this->t('Module'),
      'info' => $this->t('Information'),
    ];

    // @todo Add DI
    $entries = \Drupal::service('silverback_ai.token.usage')->getEntries();
    $entries = array_map(function ($item) {
      unset($item['response']);
      return $item;
    }, $entries);

    $build['table'] = [
      '#type' => 'table',
      '#header' => $header,
      '#rows' => $entries,
      '#sticky' => TRUE,
      '#empty' => $this->t('No records found'),
    ];

    $build['pager'] = [
      '#type' => 'pager',
    ];

    return $build;
  }

}
