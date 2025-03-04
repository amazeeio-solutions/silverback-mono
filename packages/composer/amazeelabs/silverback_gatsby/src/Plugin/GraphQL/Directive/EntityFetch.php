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
 *     "operation" = "String",
 *     "real_time" = "Boolean",
 *     "load_latest_revision" = "Boolean",
 *     "preview_user_id" = "String",
 *     "preview_access_token" = "String"
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
      'preview_user_id' => 'preview_user_id',
      'preview_access_token' => 'preview_access_token',
      'real_time' => 'real_time',
      'access_operation' => 'operation',
      'load_latest_revision' => 'load_latest_revision'
    ];
    foreach($argsMap as $argParameter => $argField) {
      if (isset($arguments[$argField])) {
        $resolver->map($argParameter, $this->argumentResolver($arguments[$argField], $builder));
      }
    }
    return $resolver;
  }

}
