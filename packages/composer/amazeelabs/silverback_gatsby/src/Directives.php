<?php

namespace Drupal\silverback_gatsby;

use Drupal\graphql\GraphQL\Resolver\ResolverInterface;
use Drupal\graphql\GraphQL\ResolverBuilder;

/**
 * Custom directives for silverback compatibility.
 */
class Directives {

  /**
   * Retrieve image properties.
   */
  public static function imageProps(ResolverBuilder $builder) : ResolverInterface {
    return $builder->produce('image_props')
      ->map('entity', $builder->fromParent());
  }

  /**
   * Attach focal point information to image properties.
   */
  public static function focalPoint(ResolverBuilder $builder) : ResolverInterface {
    return $builder->produce('focal_point')
      ->map('image_props', $builder->fromParent());
  }

  /**
   * Fetch an entity.
   */
  public static function fetchEntity(ResolverBuilder $builder): ResolverInterface {
    $resolver = $builder->produce('fetch_entity')
      ->map('type', $builder->fromArgument('type'))
      ->map('id', $builder->fromArgument('id'));

    $argsMap = [
      'revision_id' => 'rid',
      'language' => 'language',
      'access_operation' => 'operation',
      'load_latest_revision' => 'loadLatestRevision',
    ];
    foreach ($argsMap as $argParameter => $argField) {
      if ($op = $builder->fromArgument($argField)) {
        $resolver->map($argParameter, $op);
      }
    }
    return $resolver;
  }

}
