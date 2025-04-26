<?php

namespace Drupal\silverback_gutenberg;

use Drupal\Core\Entity\EntityInterface;
use Drupal\graphql\GraphQL\Resolver\ResolverInterface;
use Drupal\graphql\GraphQL\ResolverBuilder;

/**
 * Custom directives for silverback compatibility.
 */
class Directives {

  /**
   * Extract gutenberg blocks from a page.
   */
  public static function editorBlocks(ResolverBuilder $builder) : ResolverInterface {
    return $builder->produce('editor_blocks', [
      'path' => $builder->fromArgument('path'),
      'entity' => $builder->fromParent(),
      'type' => $builder->compose(
        $builder->fromParent(),
        $builder->callback(
          fn(EntityInterface $entity) =>
            $entity->getTypedData()->getDataDefinition()->getDataType()
      )),
      'ignored' => $builder->fromArgument('ignored') ?? $builder->fromValue([]),
      'aggregated' => $builder->fromArgument('aggregated') ?? $builder->fromValue(['core/paragraph']),
    ]);
  }

  /**
   * Retrieve a blocks inner-blocks.
   */
  public static function editorBlockChildren(ResolverBuilder $builder) : ResolverInterface {
    return $builder->produce('editor_block_children')
      ->map('block', $builder->fromParent());
  }

  /**
   * Retrieve a blocks markup.
   */
  public static function editorBlockMarkup(ResolverBuilder $builder) : ResolverInterface {
    return $builder->produce('editor_block_html')
      ->map('block', $builder->fromParent());
  }

  /**
   * Retrieve a blocks media entity.
   */
  public static function editorBlockMedia(ResolverBuilder $builder) : ResolverInterface {
    return $builder->produce('editor_block_media')
      ->map('block', $builder->fromParent());
  }

  /**
   * Retrieve a blocks type.
   */
  public static function editorBlockType(ResolverBuilder $builder) : ResolverInterface {
    return $builder->produce('editor_block_type')
      ->map('block', $builder->fromParent());
  }

  /**
   * Extract an attribute from a gutenberg block.
   */
  public static function editorBlockAttribute(ResolverBuilder $builder) : ResolverInterface {
    return $builder->produce('editor_block_attribute')
      ->map('block', $builder->fromParent())
      ->map('name', $builder->fromArgument('key'))
      ->map('plainText', $builder->fromArgument('plainText') ?? $builder->fromValue(TRUE));
  }

}
