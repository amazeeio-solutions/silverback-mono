<?php

namespace Drupal\silverback_gutenberg\BlockMutator;

use Drupal\Core\Cache\CacheBackendInterface;
use Drupal\Core\Extension\ModuleHandlerInterface;
use Drupal\Core\Plugin\DefaultPluginManager;
use Drupal\silverback_gutenberg\BlockMutator\BlockMutatorInterface;
use Drupal\silverback_gutenberg\Attribute\GutenbergBlockMutator;

/**
 * The block mutator plugin manager class.
 */
class BlockMutatorManager extends DefaultPluginManager implements BlockMutatorManagerInterface {

  /**
   * Constructs a BlockMutatorManager object.
   *
   * @param \Traversable $namespaces
   *   An object that implements \Traversable which contains the root paths
   *   keyed by the corresponding namespace to look for plugin implementations.
   * @param \Drupal\Core\Cache\CacheBackendInterface $cache_backend
   *   Cache backend instance to use.
   * @param \Drupal\Core\Extension\ModuleHandlerInterface $module_handler
   *   The module handler to invoke the alter hook with.
   */
  public function __construct(\Traversable $namespaces, CacheBackendInterface $cache_backend, ModuleHandlerInterface $module_handler) {
    parent::__construct(
      'Plugin/GutenbergBlockMutator',
      $namespaces,
      $module_handler,
      BlockMutatorInterface::class,
      GutenbergBlockMutator::class,
      // Keeping BC for deprecated Annotation
      'Drupal\silverback_gutenberg\Annotation\GutenbergBlockMutator',
    );
    $this->alterInfo('gutenberg_block_mutator_info');
    $this->setCacheBackend($cache_backend, 'gutenberg_block_mutator_info_plugins');
  }

  /**
   * {@inheritDoc}
   */
  public function mutateExport(array &$blocks, array &$dependencies): void {
    $this->mutate('export', $blocks, $dependencies);
  }

  /**
   * {@inheritDoc}
   */
  public function mutateImport(array &$blocks): void {
    $this->mutate('import', $blocks);
  }

  /**
   * Mutates a set of gutenberg blocks into a specicif direction
   * (import/export).
   *
   * @param string $direction
   *  The direction of the mutation. Can be "import" or "export".
   * @param array $blocks
   *  The gutenberg blocks being processed.
   * @param array $dependencies
   *  An array of dependencies for these blocks. Each key of the array should be
   *  a uuid and the value should be the corresponding entity type. Example:
   *  $dependencies['some-uuid'] = 'media';
   */
  protected function mutate(string $direction, array &$blocks, array &$dependencies = []): void {
    if (empty($blocks)) {
      return;
    }
    foreach ($this->getDefinitions() as $definition) {
      /* @var \Drupal\silverback_gutenberg\BlockMutator\BlockMutatorInterface $mutatorPlugin */
      $mutatorPlugin = $this->createInstance($definition['id']);
      $this->doMutate($mutatorPlugin, $direction, $blocks, $dependencies);
    }
  }

  /**
   * Performs a mutation recursively on a set of gutenberg blocks, using a
   * specific mutator plugin, into a specific direction (import / export).
   *
   * @param BlockMutatorInterface $mutatorPlugin
   *  A block mutator plugin.
   * @param string $direction
   *  The direction of the mutation. Can be "import" or "export". If an invalid
   *  string is sent, the "export" value is used.
   * @param array $blocks
   *  The gutenberg blocks being processed.
   * @param array $dependencies
   *  An array of dependencies for these blocks. Each key of the array should be
   *  a uuid and the value should be the corresponding entity type. Example:
   *  $dependencies['some-uuid'] = 'media';
   */
  protected function doMutate(BlockMutatorInterface $mutatorPlugin, string $direction, array &$blocks, array &$dependencies = []): void {
    foreach ($blocks as &$block) {
      if ($mutatorPlugin->applies($block)) {
        switch ($direction) {
          case 'import':
            $mutatorPlugin->mutateImport($block);
            break;
          case 'export':
          default:
            $mutatorPlugin->mutateExport($block, $dependencies);
            break;
        }
      }
      if (!empty($block['innerBlocks'])) {
        $this->doMutate($mutatorPlugin, $direction, $block['innerBlocks'], $dependencies);
      }
    }
  }

}
