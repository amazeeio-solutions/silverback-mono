<?php

namespace Drupal\silverback_gatsby\Plugin\GraphQL\Directive;

use Drupal\Core\Plugin\PluginBase;
use Drupal\graphql\GraphQL\Resolver\ResolverInterface;
use Drupal\graphql\GraphQL\ResolverBuilder;
use Drupal\graphql_directives\DirectiveInterface;
use Drupal\graphql_directives\Plugin\GraphQL\Directive\ArgumentTrait;

/**
 * @Directive(
 *   id = "fetchEntity",
 *   description = "Fetch an entity or entity revision based on id, rid or route",
 *   arguments = {
 *     "type" = "String",
 *     "id" = "String",
 *     "rid" = "String",
 *     "language" = "String",
 *     "operation" = "String"
 *   }
 * )
 */
class EntityFetch extends PluginBase implements DirectiveInterface {
  use ArgumentTrait;

  /**
   * {@inheritDoc}
   * @throws \Exception
   */
  public function buildResolver(ResolverBuilder $builder, array $arguments): ResolverInterface {
    $resolver = $builder->produce('fetch_entity')
      ->map('type', $this->argumentResolver($arguments['type'], $builder))
      ->map('id', $this->argumentResolver($arguments['id'], $builder));

    $argsMap = [
      'revision_id' => 'rid',
      'language' => 'language',
      'access_operation' => 'operation',
    ];
    foreach($argsMap as $argParameter => $argField) {
      if (isset($arguments[$argField])) {
        $resolver->map($argParameter, $this->argumentResolver($arguments[$argField], $builder));
      }
    }
    return $resolver;
  }

}
