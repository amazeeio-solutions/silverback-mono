<?php

declare(strict_types=1);

namespace Drupal\silverback_ai;

/**
 * @todo Interface for the token usage service.
 */
interface TokenUsageInterface {

  /**
   * Creates a usage entry in the database.
   *
   * This function attempts to insert a new entry in the 'silverback_ai_usage' table
   * with the provided context information. It records the current user's ID, the
   * current timestamp, and various fields from the context array. The mode is
   * retrieved from the configuration settings for 'silverback_image_ai'.
   *
   * @param array $context
   *   An associative array containing context keys:
   *   - 'tokens_in': The number of input tokens.
   *   - 'tokens_out': The number of output tokens.
   *   - 'totalcount': The total count associated with the entry.
   *
   * @throws \Exception If there is an error during the database insertion.
   *
   * @todo Validate the input array to ensure required keys are present and values are valid.
   * @todo Handle exceptions thrown during the insertion process.
   */
  public function createUsageEntry(array $context);

}
