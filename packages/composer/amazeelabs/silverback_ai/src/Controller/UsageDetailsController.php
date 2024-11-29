<?php

declare(strict_types=1);

namespace Drupal\silverback_ai\Controller;

use Drupal\Core\Controller\ControllerBase;
use Drupal\Core\Database\Connection;
use Drupal\Core\Routing\RouteMatchInterface;
use Drupal\Core\Serialization\Yaml;
use Drupal\Core\StringTranslation\StringTranslationTrait;
use Drupal\silverback_ai\TokenUsage;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * Returns responses for Silverback AI routes.
 */
class UsageDetailsController extends ControllerBase {

  use StringTranslationTrait;

  /**
   * The database connection.
   *
   * @var \Drupal\Core\Database\Connection
   */
  protected $connection;

  /**
   * The token usage service.
   *
   * @var \Drupal\silverback_ai\TokenUsage
   */
  protected $tokenUsage;

  /**
   * The controller constructor.
   */
  public function __construct(Connection $connection, TokenUsage $token_usage) {
    $this->connection = $connection;
    $this->tokenUsage = $token_usage;
  }

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container): self {
    return new self(
      $container->get('database'),
      $container->get('silverback_ai.token.usage'),
    );
  }

  /**
   * Generates an overview table of revisions for an entity.
   *
   * @param \Drupal\Core\Routing\RouteMatchInterface $routeMatch
   *   The route match.
   *
   * @return array
   *   A render array.
   *
   * @throws \Drupal\Component\Plugin\Exception\InvalidPluginDefinitionException
   * @throws \Drupal\Component\Plugin\Exception\PluginNotFoundException
   */
  public function __invoke(RouteMatchInterface $routeMatch): array {

    $id = $routeMatch->getParameter('record');

    $query = $this->connection->select('silverback_ai_usage', 's')
      ->condition('s.id', $id)
      ->fields('s', [
        'id',
        'uid',
        'timestamp',
        'target_entity_id',
        'target_entity_type_id',
        'target_entity_revision_id',
        'tokens_in',
        'tokens_out',
        'total_count',
        'provider',
        'model',
        'module',
        'response',
      ]);
    $records = $query->execute();
    foreach ($records->fetchAll() as $row) {
      $info = $this->tokenUsage->buildRow($row);
      $build['render_array'] = [
        '#type' => 'details',
        '#open' => TRUE,
        '#title' => $this->t('Response details'),
        'source' => [
          '#theme' => 'webform_codemirror',
          '#type' => 'yaml',
          '#code' => Yaml::encode($info['response']),
        ],
      ];

    }

    return $build;
  }

}
