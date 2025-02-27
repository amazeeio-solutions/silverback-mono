<?php

namespace Drupal\graphql_directives\Plugin\GraphQL\DataProducer;

use Drupal\graphql\Plugin\GraphQL\DataProducer\DataProducerPluginBase;
use Drupal\user\UserInterface;

/**
 * Returns the preferred language of a user.
 *
 * @DataProducer(
 *   id = "preferred_language",
 *   name = @Translation("User preferred language"),
 *   description = @Translation("Returns the preferred language of a user."),
 *   produces = @ContextDefinition("string",
 *     label = @Translation("Preferred language")
 *   ),
 *   consumes = {
 *     "user" = @ContextDefinition("any",
 *       label = @Translation("User")
 *     )
 *   }
 * )
 */
class PreferredLanguage extends DataProducerPluginBase {

  /**
   * Resolves the preferred language for a user.
   *
   * @param mixed $user
   *   The user entity.
   *
   * @return string|null
   *   The preferred language code or null if not set.
   */
  public function resolve($user) {
    if ($user instanceof UserInterface && $user->hasField('preferred_langcode') && !$user->get('preferred_langcode')->isEmpty()) {
      return $user->get('preferred_langcode')->value;
    }
    return 'en';
  }

}