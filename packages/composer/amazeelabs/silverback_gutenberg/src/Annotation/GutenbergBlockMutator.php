<?php

namespace Drupal\silverback_gutenberg\Annotation;

use Drupal\Component\Annotation\Plugin;

/**
 * @Annotation
 * 
 * @deprecated
 */
class GutenbergBlockMutator extends Plugin {

  /**
   * The block mutator plugin ID.
   *
   * @var string
   */
  public $id;

  /**
   * The human-readable name of the block mutator plugin.
   *
   * @ingroup plugin_translatable
   *
   * @var \Drupal\Core\Annotation\Translation
   */
  public $label;

  /**
   * The description of the block mutator plugin.
   *
   * @ingroup plugin_translatable
   *
   * @var \Drupal\Core\Annotation\Translation
   */
  public $description;

}
