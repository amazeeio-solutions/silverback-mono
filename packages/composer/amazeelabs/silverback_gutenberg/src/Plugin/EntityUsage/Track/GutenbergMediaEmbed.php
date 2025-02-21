<?php

namespace Drupal\silverback_gutenberg\Plugin\EntityUsage\Track;

use Drupal\Core\Field\FieldItemInterface;
use Drupal\entity_usage\EntityUsageTrackBase;
use Drupal\gutenberg\Parser\BlockParser;

/**
 * Tracks usage of media entities in the Gutenberg editor.
 *
 * @EntityUsageTrack(
 *   id = "gutenberg_media_embed",
 *   label = @Translation("Media embed in Gutenberg"),
 *   description = @Translation("Tracks embedded media entities in Gutenberg."),
 *   field_types = {"text", "text_long", "text_with_summary"},
 * )
 */
class GutenbergMediaEmbed extends EntityUsageTrackBase {

  /**
   * {@inheritDoc}
   */
  public function getTargetEntities(FieldItemInterface $item): array {
    $itemValue = $item->getValue();
    if (empty($itemValue['value'])) {
      return [];
    }
    $text = $itemValue['value'];
    $blockParser = new BlockParser();
    $blocks = $blockParser->parse($text);
    $references = [];
    $this->extractReferencesFromGutenbergBlocks($blocks, $references);
    return array_unique($references);
  }

  /**
   * Recursively extract all the media references from a set of gutenberg
   * blocks.
   *
   * This method will just check if there is an attribute called mediaEntityIds
   * for every block. If yes, then it will just add those ids to the list of
   * media references. Then, if the current block has any inner blocks it will
   * just call itself with the inner blocks as parameter.
   *
   * @param array $blocks
   *  An array of gutenberg blocks.
   * @param $references
   *  An array with all the extracted references until the current call.
   */
  protected function extractReferencesFromGutenbergBlocks(array $blocks, array &$references) {
    foreach ($blocks as $block) {
      if (!empty($block['attrs']['mediaEntityIds'])) {
        foreach ($block['attrs']['mediaEntityIds'] as $mediaEntityId) {
          $references[] = 'media|' . $mediaEntityId;
        }
      }
      if (!empty($block['innerBlocks'])) {
        $this->extractReferencesFromGutenbergBlocks($block['innerBlocks'], $references);
      }
    }
  }
}
