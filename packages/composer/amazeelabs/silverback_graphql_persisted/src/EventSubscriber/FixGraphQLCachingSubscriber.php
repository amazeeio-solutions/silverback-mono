<?php
namespace Drupal\silverback_graphql_persisted\EventSubscriber;

use Drupal\graphql\Event\OperationEvent;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;

/**
 * Fix GraphQL caching when internal page cache is active:
 *
 * TODO:
 * Can be removed when https://github.com/drupal-graphql/graphql/pull/1317 is
 * resolved.
 */
class FixGraphQLCachingSubscriber implements EventSubscriberInterface {

  public function onBeforeOperation(OperationEvent $event): void {
    $event->getContext()->addCacheContexts(
      ['url.query_args:variables', 'url.query_args:extensions', 'url.query_args:queryId']
    );
  }

  public static function getSubscribedEvents() {
    return [
      OperationEvent::GRAPHQL_OPERATION_BEFORE => 'onBeforeOperation',
    ];
  }
}
