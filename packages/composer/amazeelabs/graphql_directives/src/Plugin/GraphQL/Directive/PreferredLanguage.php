<?php

namespace Drupal\graphql_directives\Plugin\GraphQL\Directive;

use Drupal\Core\Plugin\PluginBase;
use Drupal\graphql\GraphQL\ResolverBuilder;
use Drupal\graphql_directives\DirectiveInterface;
use Drupal\graphql\GraphQL\Resolver\ResolverInterface;

/**
 * @Directive(
 *   id = "preferredLanguage",
 *   description = "Retrieves the preferred langcode for a user entity."
 * )
 */
class PreferredLanguage extends PluginBase implements DirectiveInterface {

    public function buildResolver(ResolverBuilder $builder, array $arguments): ResolverInterface {
        return $builder->produce('preferred_language')
            ->map('user', $builder->fromParent());
    }

}
