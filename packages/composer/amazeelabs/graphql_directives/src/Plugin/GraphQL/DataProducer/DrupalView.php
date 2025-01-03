<?php

namespace Drupal\graphql_directives\Plugin\GraphQL\DataProducer;

use Drupal\Core\Entity\EntityInterface;
use Drupal\Core\Entity\TranslatableInterface;
use Drupal\Core\Render\Element;
use Drupal\Core\Render\RenderContext;
use Drupal\graphql\GraphQL\Execution\FieldContext;
use Drupal\graphql\Plugin\GraphQL\DataProducer\DataProducerPluginBase;
use Drupal\views\ResultRow;
use Drupal\views\Views;

/**
 * @DataProducer(
 *   id = "drupal_view",
 *   name = @Translation("Drupal view"),
 *   description = @Translation("Executes a Drupal view."),
 *   produces = @ContextDefinition("any",
 *     label = @Translation("An array with view info and results"),
 *     multiple = TRUE
 *   ),
 *   consumes = {
 *     "id" = @ContextDefinition("string",
 *       label = @Translation("View ID and display ID divided by a comma"),
 *     ),
 *     "args" = @ContextDefinition("string",
 *       label = @Translation("Filters, pagination etc. in form of a URL query string"),
 *       required = FALSE,
 *     )
 *   }
 * )
 */
class DrupalView extends DataProducerPluginBase {

  public function resolve(string $id, ?string $args, FieldContext $context): array {
    return $this->withCacheContext($context, function() use ($id, $args, $context) {
      [$viewId, $viewDisplayId] = explode(':', $id);

      $view = Views::getView($viewId);
      if (!$view) {
        throw new \Exception("View {$viewId} not found.");
      }

      if (!$view->setDisplay($viewDisplayId)) {
        throw new \Exception("Display {$viewDisplayId} not found in view {$viewId}.");
      }

      $arguments = [];
      if ($args) {
        parse_str($args, $arguments);
      }

      $pageSize = 10;
      if (isset($arguments['pageSize']) && is_numeric($arguments['pageSize'])) {
        $pageSize = (int) $arguments['pageSize'];
      }
      $view->setItemsPerPage($pageSize);
      unset($arguments['pageSize']);

      $page = 1;
      if (isset($arguments['page']) && is_numeric($arguments['page'])) {
        $page = (int) $arguments['page'];
      }
      $offset = ($page - 1) * $pageSize;
      $view->setOffset($offset);
      unset($arguments['page']);

      $contextualFilters = [];
      if (isset($arguments['contextualFilters']) && is_string($arguments['contextualFilters'])) {
        $contextualFilters = explode('/', $arguments['contextualFilters']);
        $view->setArguments($contextualFilters);
      }
      unset($arguments['contextualFilters']);

      if (!empty($arguments)) {
        $view->setExposedInput($arguments);
      }

      $view->get_total_rows = TRUE;
      $view->execute();

      $rows = array_map(function(ResultRow $row) use ($context) {
        $entity = $row->_entity;
        if (!($entity instanceof EntityInterface)) {
          throw new \Exception("Row is not an entity.");
        }
        if ($entity instanceof TranslatableInterface && $entity->hasTranslation($context->getContextLanguage())) {
          $entity = $entity->getTranslation($context->getContextLanguage());
        }
        return $entity;
      }, $view->result);

      $total = ($view->total_rows ?: 0) + $offset;

      $form = $view->exposed_widgets;
      $filters = [];
      if (!empty($form)) {
        foreach (Element::children($form) as $key) {
          if (isset($form[$key]['#options'])) {
            foreach ($form[$key]['#options'] as $value => $label) {
              if (is_object($label) && isset($label->option)) {
                $label = $label->option;
              }
              $filters[$key][] = [
                'value' => (string)$value,
                'label' => (string)$label,
              ];
            }
          }
        }
      }

      // There's no single method to get all views cache metadata. But the
      // following should cover most of it.
      $context->addCacheTags($view->getCacheTags());
      $context->addCacheableDependency($view->storage);
      $context->addCacheableDependency($view->display_handler->getCacheMetadata());

      return [
        '#info' => [
          'view' => $view,
          'page_size' => $pageSize,
          'page' => $page,
          'contextual_filters' => $contextualFilters,
        ],
        'rows' => $rows,
        'total' => $total,
        'filters' => $filters,
      ];
    });
  }

  function withCacheContext(FieldContext $resolveContext, callable $callback) {
    /** @var \Drupal\Core\Render\RendererInterface $renderer */
    $renderer = \Drupal::service('renderer');
    $renderContext = new RenderContext();
    $result = $renderer->executeInRenderContext($renderContext, fn() => $callback());
    if (!$renderContext->isEmpty()) {
      $resolveContext->addCacheableDependency($renderContext->pop());
    }
    return $result;
  }

}
