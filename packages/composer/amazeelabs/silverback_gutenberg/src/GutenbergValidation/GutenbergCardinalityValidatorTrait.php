<?php

namespace Drupal\silverback_gutenberg\GutenbergValidation;

use Drupal\Core\StringTranslation\TranslatableMarkup;

/**
 * Cardinality validator helper.
 */
trait GutenbergCardinalityValidatorTrait {

  /**
   * Validates the cardinality of the inner blocks of a block.
   *
   * This helper can be called from the validateContent() method of a validator.
   *
   * Example to validate the cardinality of all inner blocks (any, no matter the name).
   * @code
   * [
   *   'validationType' => GutenbergCardinalityValidatorInterface::CARDINALITY_ANY,
   *   'min' => 0,
   *   'max' => 3,
   * ]
   * @endcode
   *
   * Example to validate by block name:
   * @code
   * [
   *   [
   *     'blockName' => 'core/paragraph',
   *     'blockLabel' => $this->t('Paragraph'),
   *     'min' => 0,
   *     'max' => 3,
   *   ],
   *   [
   *     'blockName' => 'core/embed',
   *     'blockLabel' => $this->t('Embed'),
   *     'min' => 1,
   *     'max' => 2,
   *   ],
   *   [
   *     'blockName' => 'core/block',
   *     'blockLabel' => $this->t('Reusable block'),
   *     'min' => 1,
   *     'max' => GutenbergCardinalityValidatorInterface::CARDINALITY_UNLIMITED,
   *   ],
   * ];
   * @endcode
   *
   * @param array $block
   * @param array $expected_children
   *
   * @return array
   */
  public function validateCardinality(array $block, array $expected_children): array {
    // Nothing to validate.
    if (empty($expected_children)) {
      return [
        'is_valid' => TRUE,
        'message' => '',
      ];
    }

    // Check if the quantity validation is any block, no matter the name.
    if (
      !empty($expected_children['validationType']) &&
      $expected_children['validationType'] === GutenbergCardinalityValidatorInterface::CARDINALITY_ANY) {
      return $this->validateAnyInnerBlocks($block, $expected_children);
    }

    // Exit early if there are no inner blocks.
    if (empty($block['innerBlocks'])) {
      return $this->validateEmptyInnerBlocks($expected_children);
    }

    // Count blocks, then check if the quantity for each is correct.
    $countInnerBlockInstances = [];
    foreach ($block['innerBlocks'] as $innerBlock) {
      if (!isset($countInnerBlockInstances[$innerBlock['blockName']])) {
        $countInnerBlockInstances[$innerBlock['blockName']] = 0;
      }

      $hasContent = FALSE;

      // Check if the inner blocks have content.
      if (!empty($innerBlock['innerBlocks'])) {
        foreach ($innerBlock['innerBlocks'] as $innerBlockContent) {
          if (trim(strip_tags($innerBlockContent['innerHTML'])) !== '') {
            $hasContent = TRUE;
            break;
          }
        }
      }
      else {
        // Check the content of the block itself if there are no inner blocks.
        $hasContent = trim(strip_tags($innerBlock['innerHTML'])) !== '';
      }

      // Increment the counter if the block has meaningful content.
      if ($hasContent) {
        $countInnerBlockInstances[$innerBlock['blockName']]++;
      }
    }

    foreach ($expected_children as $child) {
      if (!isset($countInnerBlockInstances[$child['blockName']]) && $child['min'] > 0) {
        $message = $this->getExpectedQuantityErrorMessage($child);
        return [
          'is_valid' => FALSE,
          'message' => $message,
        ];
      }
      // Minimum is set to 0, so we don't care if the block is not present.
      if (!isset($countInnerBlockInstances[$child['blockName']]) && $child['min'] === 0) {
        return [
          'is_valid' => TRUE,
          'message' => '',
        ];
      }
      if ($countInnerBlockInstances[$child['blockName']] < $child['min']) {
        return [
          'is_valid' => FALSE,
          'message' => \Drupal::translation()->formatPlural($child['min'],
            '%label: at least @min block is required.',
            '%label: at least @min blocks are required.',
            [
              '%label' => $child['blockLabel'],
              '@min' => $child['min'],
            ]),
        ];
      }
      if ($child['max'] !== GutenbergCardinalityValidatorInterface::CARDINALITY_UNLIMITED && $countInnerBlockInstances[$child['blockName']] > $child['max']) {
        return [
          'is_valid' => FALSE,
          'message' => \Drupal::translation()->formatPlural($child['max'],
            '%label: at most @max block is allowed.',
            '%label: at most @max blocks are allowed.',
            [
              '%label' => $child['blockLabel'],
              '@max' => $child['max'],
            ]),
        ];
      }
    }

    return [
      'is_valid' => TRUE,
      'message' => '',
    ];
  }

  /**
   * Check if it's fine to not have any inner blocks.
   *
   * Returns a message with all expected children blocks if needed.
   *
   * @param array $expected_children
   *
   * @return array|void
   */
  private function validateEmptyInnerBlocks (array $expected_children): array {
    $missingBlocksMessages = [];
    foreach ($expected_children as $child) {
      if ($child['min'] > 0) {
        $message = $this->getExpectedQuantityErrorMessage($child);
        $missingBlocksMessages[] = $message;
      }
    }
    if (!empty($missingBlocksMessages)) {
      $errorMessage = t('Required blocks are missing.');
      $errorMessage .= ' ' . implode(' ', $missingBlocksMessages);
      return [
        'is_valid' => FALSE,
        'message' => $errorMessage,
      ];
    }

    return [
      'is_valid' => TRUE,
      'message' => '',
    ];
  }

  /**
   * Validates the cardinality of any inner blocks.
   *
   * @param array $inner_blocks
   * @param array $expected_children
   *
   * @return array
   */
  private function validateAnyInnerBlocks(array $inner_blocks, array $expected_children): array {
    $min = $expected_children['min'];
    $max = $expected_children['max'];
    $count = count($inner_blocks['innerBlocks']);
    if ($count < $min) {
      return [
        'is_valid' => FALSE,
        'message' => \Drupal::translation()->formatPlural($min,
          'At least @min block is required.',
          'At least @min blocks are required.',
          [
            '@min' => $min,
          ]),
      ];
    }
    if ($max !== GutenbergCardinalityValidatorInterface::CARDINALITY_UNLIMITED && $count > $max) {
      return [
        'is_valid' => FALSE,
        'message' => \Drupal::translation()->formatPlural($max,
          'At most @max block is allowed.',
          'At most @max blocks are allowed.',
          [
            '@max' => $max,
          ]),
      ];
    }

    return [
      'is_valid' => TRUE,
      'message' => '',
    ];
  }

  private function getExpectedQuantityErrorMessage(array $child_block): string|TranslatableMarkup {
    $messageParams = [
      '%label' => $child_block['blockLabel'],
      '@min' => $child_block['min'],
      '@max' => $child_block['max'] > 0 ? $child_block['max'] : t('unlimited'),
    ];
    $result = t('%label: there should be between @min and @max blocks.', $messageParams);
    if ($child_block['min'] === $child_block['max']) {
      $result = \Drupal::translation()->formatPlural($child_block['min'],
        '%label: there should be exactly @min block.',
        '%label: there should be exactly @min blocks.',
        $messageParams);
    }
    return $result;
  }

}
