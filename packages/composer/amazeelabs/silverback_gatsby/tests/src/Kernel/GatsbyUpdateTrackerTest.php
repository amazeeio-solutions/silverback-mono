<?php

namespace Drupal\Tests\silverback_gatsby\Kernel;

use Drupal\graphql\Entity\Server;
use Drupal\KernelTests\KernelTestBase;
use Drupal\silverback_gatsby\GatsbyUpdate;
use Drupal\Tests\silverback_gatsby\Traits\NotificationCheckTrait;

/**
 *
 */
class GatsbyUpdateTrackerTest extends KernelTestBase {
  use NotificationCheckTrait;

  protected $strictConfigSchema = FALSE;

  /**
   * @var string[]
   */
  protected static $modules = [
    'language',
    'user',
    'node',
    'graphql',
    'file',
    'content_translation',
    'graphql_directives',
    'silverback_gatsby',
    'silverback_gatsby_example',
    'menu_link_content',
    'path_alias',
  ];

  /**
   * @var \Drupal\silverback_gatsby\GatsbyUpdateTracker|object|null
   */
  protected $tracker;

  /**
   * {@inheritdoc}
   */
  protected function setUp() : void {
    parent::setUp();
    $this->setupClientProphecy();
    $this->installConfig('graphql');
    $this->installSchema('silverback_gatsby', ['gatsby_update_log']);
    Server::create([
      'schema' => 'directable',
      'name' => 'foo',
      'endpoint' => '/foo',
      'schema_configuration' => [
        'directable' => [
          'extensions' => [
            'silverback_gatsby' => 'silverback_gatsby',
          ],
          'schema_definition' => __DIR__ . '/../../../modules/silverback_gatsby_example/graphql/silverback_gatsby_example.graphqls',
          'build_webhook' => 'http://localhost:8000/__refresh',
        ],
      ],
    ])->save();
    Server::create([
      'schema' => 'directable',
      'name' => 'bar',
      'endpoint' => '/bar',
      'schema_configuration' => [
        'directable' => [
          'extensions' => [
            'silverback_gatsby' => 'silverback_gatsby',
          ],
          'schema_definition' => __DIR__ . '/../../../modules/silverback_gatsby_example/graphql/silverback_gatsby_example.graphqls',
          'build_webhook' => 'http://localhost:8000/__refresh',
        ],
      ],
    ])->save();
    $this->tracker = $this->container->get('silverback_gatsby.update_tracker');
  }

  /**
   *
   */
  public function testNoBuilds() {
    $this->assertEquals(-1, $this->tracker->latestBuild('foo'));
    $this->assertEmpty($this->tracker->diff(1, 2, 'foo'));
    _drupal_shutdown_function();
    $this->checkTotalNotifications(0);
  }

  /**
   *
   */
  public function testSingleBuild() {
    $this->tracker->track('foo', 'Page', '1');
    $this->assertEquals(1, $this->tracker->latestBuild('foo'));
    _drupal_shutdown_function();
    $this->checkTotalNotifications(1);
  }

  /**
   *
   */
  public function testMultipleBuilds() {
    $this->tracker->track('foo', 'Page', '1');
    $this->tracker->track('foo', 'Page', '2');
    $this->assertEquals(2, $this->tracker->latestBuild('foo'));
    $this->assertEquals([new GatsbyUpdate('Page', '2')],
      $this->tracker->diff(1, 2, 'foo')
    );
  }

  /**
   *
   */
  public function testDeferredBuild() {
    $this->tracker->track('foo', 'Page', '1', FALSE);
    $this->assertEquals(1, $this->tracker->latestBuild('foo'));
    _drupal_shutdown_function();
    $this->checkTotalNotifications(0);
  }

  /**
   *
   */
  public function testInvalidDiff() {
    $this->tracker->track('foo', 'Page', '1');
    $this->tracker->track('foo', 'Page', '2');

    // If one of the builds does not exist, it returns an empty list.
    // We are not sure about the history then, so we have to run a full rebuild.
    $this->assertEquals([],
      $this->tracker->diff(0, 2, 'foo')
    );

    $this->assertEquals([],
      $this->tracker->diff(1, 3, 'foo')
    );

    $this->assertEquals([],
      $this->tracker->diff(0, 4, 'foo')
    );

    // In reverse order it will return an empty list too.
    $this->assertEquals([],
      $this->tracker->diff(2, 1, 'foo')
    );
  }

  /**
   *
   */
  public function testMultipleServers() {
    $this->tracker->track('foo', 'Page', '1');
    $this->tracker->track('foo', 'Page', '2');
    $this->tracker->track('bar', 'Page', '1');
    $this->tracker->track('bar', 'Page', '3');

    $this->assertEquals(2, $this->tracker->latestBuild('foo'));
    $this->assertEquals(4, $this->tracker->latestBuild('bar'));

    $this->assertEquals([
      new GatsbyUpdate('Page', '2'),
    ], $this->tracker->diff(1, 2, 'foo'));

    $this->assertEquals([], $this->tracker->diff(1, 2, 'bar'));

    $this->assertEquals([
      new GatsbyUpdate('Page', '3'),
    ], $this->tracker->diff(3, 4, 'bar'));
  }

  public function testDuplicateItems() {
    $this->tracker->track('foo', 'Page', '1');
    $this->tracker->track('foo', 'Page', '2');

    // Simulate a new PHP request to track a duplicate. Otherwise, it won't be
    // tracked.
    $this->tracker->clear();

    // Add a duplicate entry.
    $this->tracker->track('foo', 'Page', '2');

    // Expect no duplicates in the diff.
    $this->assertEquals(
      [new GatsbyUpdate('Page', '2')],
      $this->tracker->diff(1, 3, 'foo')
    );
  }

}
