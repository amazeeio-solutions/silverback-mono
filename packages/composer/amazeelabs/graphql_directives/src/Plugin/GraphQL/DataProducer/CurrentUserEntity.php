<?php

namespace Drupal\graphql_directives\Plugin\GraphQL\DataProducer;

use Drupal\Core\Session\AccountProxyInterface;
use Drupal\graphql\GraphQL\Execution\FieldContext;
use Drupal\graphql\Plugin\GraphQL\DataProducer\User\CurrentUser;
use Drupal\user\Entity\User;
use Drupal\user\UserInterface;

/**
 * @DataProducer(
 *   id = "current_user_entity",
 *   name = @Translation("Current User Entity"),
 *   description = @Translation("Returns the current authenticated user. Extends the core current_user, to return the User entity instead of the AccountProxy."),
 *   produces = @ContextDefinition("entity:user",
 *     label = @Translation("User")
 *   )
 * )
 */
class CurrentUserEntity extends CurrentUser {

  /**
   * Returns the current user.
   *
   * @param \Drupal\graphql\GraphQL\Execution\FieldContext $field_context
   *   Field context.
   *
   * @return \Drupal\user\UserInterface
   *   The current user.
   */
  public function resolve(FieldContext $field_context): UserInterface {
    // Response must be cached based on current user as a cache context,
    // otherwise a new user would become a previous user.
    $field_context->addCacheableDependency($this->currentUser);
    $user = NULL;
    if ($this->currentUser instanceof AccountProxyInterface) {
      $user = User::load($this->currentUser->id());
    }
    return $user;
  }

}
