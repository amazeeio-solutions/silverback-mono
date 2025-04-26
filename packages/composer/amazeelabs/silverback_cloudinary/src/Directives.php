<?php

namespace Drupal\silverback_cloudinary;

use Drupal\graphql\GraphQL\Resolver\ResolverInterface;
use Drupal\graphql\GraphQL\ResolverBuilder;

/**
 * Custom directives for silverback compatibility.
 */
class Directives {

  /**
   * Retrieve responsive image data.
   */
  public static function responsiveImage(ResolverBuilder $builder) : ResolverInterface {
    return $builder->produce('responsive_image')
      ->map('image', $builder->fromParent())
      ->map('width', $builder->fromArgument('width'))
      ->map('height', $builder->fromArgument('height'))
      ->map('sizes', $builder->fromArgument('sizes'))
      ->map('transform', $builder->fromArgument('transform'));
  }

}
