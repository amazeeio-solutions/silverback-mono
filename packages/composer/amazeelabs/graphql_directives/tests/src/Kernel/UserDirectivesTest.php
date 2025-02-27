<?php

namespace Drupal\Tests\graphql_directives\Kernel;

use Drupal\Core\DependencyInjection\ContainerBuilder;
use Drupal\Tests\graphql\Kernel\GraphQLTestBase;
use Drupal\Tests\graphql_directives\Traits\GraphQLDirectivesTestTrait;
use Drupal\user\Entity\User;

/**
 * Tests the currentUser and preferredLanguage directives.
 *
 * @group graphql_directives
 */
class UserDirectivesTest extends GraphQLTestBase {
  use GraphQLDirectivesTestTrait;

  public static $modules = [
    'user',
    'language',
    'graphql_directives',
    'silverback_gatsby',
  ];

  /**
   * {@inheritdoc}
   */
  public function register(ContainerBuilder $container) {
    parent::register($container);
  }

  /**
   * {@inheritdoc}
   */
  protected function setUp(): void {
    parent::setUp();
    $this->installEntitySchema('user');
    $this->installConfig(['user', 'language']);
    $this->setupDirectableSchema(__DIR__ . '/../../assets/users');
  }

  /**
   * Tests the currentUser directive with anonymous user.
   */
  public function testCurrentUserDirectiveAnonymous() {
    // Set anonymous user as current user
    $anonymous = User::load(0);
    $this->setCurrentUser($anonymous);

    $metadata = $this->defaultCacheMetaData();
    $metadata->addCacheableDependency($anonymous);
    $metadata->setCacheMaxAge(0);
    $this->assertResults('query { currentUser { id  } }', [], [
      'currentUser' => [
        'id' => '0',
      ]
    ], $metadata);
  }

  /**
   * Tests the currentUser directive with authenticated user.
   */
  public function testCurrentUserDirectiveAuthenticated() {
    // Create and set an authenticated user
    $user = User::create([
      'name' => 'test_user',
      'mail' => 'test@example.com',
      'status' => 1,
    ]);
    $user->save();
    $this->setCurrentUser($user);

    $metadata = $this->defaultCacheMetaData();
    $metadata->addCacheableDependency($user);
    $metadata->setCacheMaxAge(0);
    $this->assertResults('query { currentUser { id } }', [], [
      'currentUser' => [
        'id' => $user->id(),
      ]
    ], $metadata);
  }

  /**
   * Tests the preferredLanguage directive with default language.
   */
  public function testPreferredLanguageDirectiveDefault() {
    // Create a user with default language preference
    $user = User::create([
      'name' => 'language_user',
      'mail' => 'language@example.com',
      'status' => 1,
      'preferred_langcode' => 'en',
    ]);
    $user->save();
    $this->setCurrentUser($user);

    $metadata = $this->defaultCacheMetaData();
    $metadata->addCacheableDependency($user);
    $metadata->setCacheMaxAge(0);
    $this->assertResults('query { currentUser { id preferredLanguage } }', [], [
      'currentUser' => [
        'id' => $user->id(),
        'preferredLanguage' => 'en',
      ]
    ], $metadata);
  }

  /**
   * Tests the preferredLanguage directive with custom language.
   */
  public function testPreferredLanguageDirectiveCustom() {
    // Create a user with French language preference
    $user = User::create([
      'name' => 'french_user',
      'mail' => 'french@example.com',
      'status' => 1,
      'preferred_langcode' => 'fr',
    ]);
    $user->save();
    $this->setCurrentUser($user);

    $metadata = $this->defaultCacheMetaData();
    $metadata->addCacheableDependency($user);
    $metadata->setCacheMaxAge(0);
    $this->assertResults('query { currentUser { id preferredLanguage } }', [], [
      'currentUser' => [
        'id' => $user->id(),
        'preferredLanguage' => 'fr',
      ]
    ], $metadata);
  }

  /**
   * Tests both directives together in a more complex query.
   */
  public function testCombinedDirectives() {
    // Create a user with German language preference
    $user = User::create([
      'name' => 'german_user',
      'mail' => 'german@example.com',
      'status' => 1,
      'preferred_langcode' => 'de',
    ]);
    $user->save();
    $this->setCurrentUser($user);

    $metadata = $this->defaultCacheMetaData();
    $metadata->addCacheableDependency($user);
    $metadata->setCacheMaxAge(0);
    $this->assertResults('
      query { 
        currentUser { 
          id 
          preferredLanguage 
        } 
      }', [], [
      'currentUser' => [
        'id' => $user->id(),
        'preferredLanguage' => 'de',
      ]
    ], $metadata);
  }

  /**
   * Tests the preferredLanguage directive with a user that has no preference set.
   */
  public function testPreferredLanguageDirectiveNoPreference() {
    // Create a user without explicit language preference
    $user = User::create([
      'name' => 'no_pref_user',
      'mail' => 'nopref@example.com',
      'status' => 1,
      // No preferred_langcode set
    ]);
    $user->save();
    $this->setCurrentUser($user);

    $metadata = $this->defaultCacheMetaData();
    $metadata->addCacheableDependency($user);
    $metadata->setCacheMaxAge(0);
    // Should return null or site default
    $this->assertResults('query { currentUser { id preferredLanguage } }', [], [
      'currentUser' => [
        'id' => $user->id(),
        'preferredLanguage' => 'en'
      ]
    ], $metadata);
  }
} 