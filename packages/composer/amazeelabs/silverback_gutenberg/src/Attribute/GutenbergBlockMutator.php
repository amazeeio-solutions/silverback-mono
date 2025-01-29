<?php

declare(strict_types=1);

namespace Drupal\silverback_gutenberg\Attribute;

use Drupal\Component\Plugin\Attribute\Plugin;
use Drupal\Core\StringTranslation\TranslatableMarkup;

#[\Attribute(\Attribute::TARGET_CLASS)]
class GutenbergBlockMutator extends Plugin {

  /**
   * Constructs a GutenbergBlockMutator attribute.
   *
   * @param string $id
   *   The plugin ID.
   * @param \Drupal\Core\StringTranslation\TranslatableMarkup|null $label
   *   (optional) The human-readable name of the mutator.
   * @param \Drupal\Core\StringTranslation\TranslatableMarkup|null $description
   *   (optional) A short description of the mutator.
   */
  public function __construct(
    public readonly string $id,
    public readonly ?TranslatableMarkup $label = NULL,
    public readonly ?TranslatableMarkup $description = NULL,
  ) {}

}
