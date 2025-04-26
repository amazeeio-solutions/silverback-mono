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
      ->map('id', $builder->fromArgument('id'))
      ->map('revision_id', $builder->fromArgument('rid'))
      ->map('language', $builder->fromArgument('language'))
      ->map('preview_user_id', $builder->fromArgument('preview_user_id'))
      ->map('preview_access_token', $builder->fromArgument('preview_access_token'));
    // If empty, delegate to access_operation default value
    // from the fetch_entity data producer.
    if ($op = $builder->fromArgument('operation')) {
      $resolver->map('access_operation', $op);
    }
    return $resolver;
  }

}
