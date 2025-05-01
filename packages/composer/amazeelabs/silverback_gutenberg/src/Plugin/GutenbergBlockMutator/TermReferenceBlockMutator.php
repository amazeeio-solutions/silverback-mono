<?php

namespace Drupal\silverback_gutenberg\Plugin\GutenbergBlockMutator;

use Drupal\silverback_gutenberg\Attribute\GutenbergBlockMutator;
use Drupal\silverback_gutenberg\BlockMutator\EntityBlockMutatorBase;
use Drupal\Core\StringTranslation\TranslatableMarkup;

#[GutenbergBlockMutator(
  id: "term_reference_block_mutator",
  label: new TranslatableMarkup("Term References to UUIDs and vice versa."),
)]
class TermReferenceBlockMutator extends EntityBlockMutatorBase {

  /**
   * {@inheritDoc}
   */
  public string $entityTypeId = 'taxonomy_term';

  /**
   * {@inheritDoc}
   */
  public function applies(array $block): bool {
    // Skip the parent applies() check since we want to be more flexible
    if (empty($block['attrs'])) {
      return FALSE;
    }

    // Check if any attribute is registered as a term reference
    foreach ($block['attrs'] as $attrName => $value) {
      // Skip empty values
      if (empty($value)) {
        continue;
      }

      // Check if attribute is marked as a term reference
      if ($this->isTermReferenceAttribute($attrName, $block, $value)) {
        // Store the current attribute being processed
        $this->gutenbergAttribute = $attrName;

        // Auto-detect if multiple values
        $this->isMultiple = is_array($value);

        return TRUE;
      }
    }

    return FALSE;
  }

  /**
   * Determine if an attribute is a term reference.
   *
   * @param string $attrName
   *   The attribute name to check.
   * @param array $block
   *   The block data.
   * @param mixed $value
   *   The attribute value.
   *
   * @return bool
   *   TRUE if the attribute is a term reference.
   */
  protected function isTermReferenceAttribute(string $attrName, array $block, $value): bool {
    if (preg_match('/(Term|Terms|TermId)$/i', $attrName)) {
      // For single values
      if (!is_array($value)) {
        return $this->isValidTermIdentifier($value);
      }
      // For multiple values, check if all values are valid identifiers
      elseif (is_array($value) && !empty($value)) {
        return array_reduce($value, function ($carry, $item) {
          return $carry && $this->isValidTermIdentifier($item);
        }, TRUE);
      }
    }

    // Add other checks here if needed
    return FALSE;
  }

  /**
   * Check if a value is a valid term identifier (numeric ID or UUID).
   *
   * @param mixed $value
   *   The value to check.
   *
   * @return bool
   *   TRUE if the value is a valid term identifier.
   */
  protected function isValidTermIdentifier($value): bool {
    // Check if it's a numeric term ID
    if (is_numeric($value)) {
      return TRUE;
    }

    // Check if it's a UUID format
    if (is_string($value) && preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $value)) {
      return TRUE;
    }

    return FALSE;
  }
}
