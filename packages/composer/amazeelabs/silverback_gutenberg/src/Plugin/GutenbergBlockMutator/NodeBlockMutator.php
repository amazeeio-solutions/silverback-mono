<?php

namespace Drupal\silverback_gutenberg\Plugin\GutenbergBlockMutator;

use Drupal\silverback_gutenberg\Attribute\GutenbergBlockMutator;
use Drupal\silverback_gutenberg\BlockMutator\EntityBlockMutatorBase;
use Drupal\Core\StringTranslation\TranslatableMarkup;

#[GutenbergBlockMutator(
  id: "node_block_mutator",
  label: new TranslatableMarkup("Node ID to UUID and viceversa."),
)]
class NodeBlockMutator extends EntityBlockMutatorBase {

  /**
   * {@inheritDoc}
   */
  public string $gutenbergAttribute = 'nodeId';

  /**
   * {@inheritDoc}
   */
  public string $entityTypeId = 'node';

}
