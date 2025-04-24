<?php

namespace Drupal\Tests\silverback_gatsby\Kernel;

use Drupal\Core\DependencyInjection\ContainerBuilder;
use Drupal\node\Entity\Node;
use Drupal\Tests\Traits\Core\PathAliasTestTrait;

class EntityFeedTest extends EntityFeedTestBase {
  use PathAliasTestTrait;

  protected static $modules = ['path_alias'];

  public function register(ContainerBuilder $container) {
    parent::register($container);

    // Restore AliasPathProcessor tags which are removed in the parent method.
    $container->getDefinition('path_alias.path_processor')
      ->addTag('path_processor_inbound', ['priority' => 100])
      ->addTag('path_processor_outbound', ['priority' => 300]);
  }

  public function setUp(): void {
    parent::setUp();
    $this->installEntitySchema('path_alias');
  }

  public function testUntranslatableEntity() {
    $node = Node::create([
      'type' => 'blog',
      'title' => 'Test'
    ]);
    $node->save();

    $query = $this->getQueryFromFile('untranslatable.gql');
    $metadata = $this->defaultCacheMetaData();
    $metadata->addCacheContexts(['user.node_grants:view']);
    $metadata->addCacheTags(['node:1', 'node_list']);
    $this->assertResults($query, [], [
      '_loadPost' => [
        'title' => 'Test',
      ],
      '_queryPosts' => [
        [
          '_id' => $node->uuid(),
          '_drupalId' => $node->uuid(),
          'title' => 'Test',
        ],
      ],
    ], $metadata);
  }

  public function testTranslatableEntity() {
    $node = Node::create([
      'type' => 'page',
      'title' => 'Test'
    ]);
    $node->save();

    $query = $this->getQueryFromFile('translatable.gql');
    $metadata = $this->defaultCacheMetaData();
    $metadata->addCacheContexts(['user.node_grants:view', 'static:language:en']);
    $metadata->addCacheTags(['node:1', 'node_list']);
    $this->assertResults($query, ['id' => '1:en'], [
      '_loadPage' => [
        'title' => 'Test',
      ],
      '_queryPages' => [
        [
          '_id' => $node->uuid() . ':en',
          '_drupalId' => $node->uuid(),
          '_translations' => [
            [
              '_defaultTranslation' => true,
              '_langcode' => 'en',
              'title' => 'Test',
            ],
          ],
        ],
      ],
    ], $metadata);
  }

  public function testLanguageNotApplicable() {
    $node = Node::create([
      'type' => 'page',
      'title' => 'Test',
      'langcode' => 'zxx',
    ]);
    $node->save();

    $query = $this->getQueryFromFile('translatable.gql');
    $metadata = $this->defaultCacheMetaData();
    $metadata->addCacheContexts(['user.node_grants:view']);
    $metadata->addCacheTags(['node:1', 'node_list']);
    $this->assertResults($query, ['id' => '1:zxx'], [
      '_loadPage' => [
        'title' => 'Test',
      ],
      '_queryPages' => [
        [
          '_id' => $node->uuid() . ':zxx',
          '_drupalId' => $node->uuid(),
          '_translations' => [
            [
              '_defaultTranslation' => true,
              '_langcode' => 'zxx',
              'title' => 'Test',
            ],
          ],
        ],
      ],
    ], $metadata);
  }

  public function testLanguageNotSpecified() {
    $node = Node::create([
      'type' => 'page',
      'title' => 'Test',
      'langcode' => 'und',
    ]);
    $node->save();

    $query = $this->getQueryFromFile('translatable.gql');
    $metadata = $this->defaultCacheMetaData();
    $metadata->addCacheContexts(['user.node_grants:view']);
    $metadata->addCacheTags(['node:1', 'node_list']);
    $this->assertResults($query, ['id' => '1:und'], [
      '_loadPage' => [
        'title' => 'Test',
      ],
      '_queryPages' => [
        [
          '_id' => $node->uuid() . ':und',
          '_drupalId' => $node->uuid(),
          '_translations' => [
            [
              '_defaultTranslation' => true,
              '_langcode' => 'und',
              'title' => 'Test',
            ],
          ],
        ],
      ],
    ], $metadata);
  }

  public function testAccessDenied() {
    $node = Node::create([
      'type' => 'page',
      // A custom entity access hook in silverback_gatsby_example will make
      // entities with this label inaccessible.
      'title' => 'Access denied',
    ]);
    $node->save();

    $query = $this->getQueryFromFile('translatable.gql');
    $metadata = $this->defaultCacheMetaData();
    $metadata->addCacheContexts(['user.node_grants:view']);
    $metadata->addCacheTags(['node:1', 'node_list']);
    $this->assertResults($query, ['id' => $node->uuid() . ':en'], [
      '_loadPage' => NULL,
      '_queryPages' => [
        null
      ],
    ], $metadata);
  }

  public function testDeletedTranslation() {
    $node = Node::create([
      'type' => 'page',
      'title' => 'English',
    ]);
    $node->save();
    $node->addTranslation('de', ['title' => 'German'])->save();
    $node->removeTranslation('de');
    $node->save();

    $query = $this->getQueryFromFile('translatable.gql');
    $metadata = $this->defaultCacheMetaData();
    $metadata->addCacheContexts(['user.node_grants:view', 'static:language:en']);
    $metadata->addCacheTags(['node:1', 'node_list']);
    $this->assertResults($query, ['id' => '1:de'], [
      '_loadPage' => null,
      '_queryPages' => [
        [
          '_id' => $node->uuid() . ':en',
          '_drupalId' => $node->uuid(),
          '_translations' => [
            [
              '_defaultTranslation' => true,
              '_langcode' => 'en',
              'title' => 'English',
            ],
          ],
        ],
      ],
    ], $metadata);
  }

  public function testUnpublishedTranslation() {
    $node = Node::create([
      'type' => 'page',
      'title' => 'English',
    ]);
    $node->save();
    $node->addTranslation('de', ['title' => 'German', 'status' => 0])->save();

    $query = $this->getQueryFromFile('translatable.gql');
    $metadata = $this->defaultCacheMetaData();
    $metadata->addCacheContexts(['user.node_grants:view', 'static:language:en', 'static:language:de']);
    $metadata->addCacheTags(['node:1', 'node_list']);
    $this->assertResults($query, ['id' => $node->uuid() . ':de'], [
      '_loadPage' => NULL,
      '_queryPages' => [
        [
          '_id' => $node->uuid() . ':en',
          '_drupalId' => $node->uuid(),
          '_translations' => [
            [
              '_defaultTranslation' => true,
              '_langcode' => 'en',
              'title' => 'English',
            ],
          ],
        ],
      ],
    ], $metadata);
  }

  public function testUnpublishedSource() {
    $node = Node::create([
      'type' => 'page',
      'title' => 'English',
      'status' => 0,
    ]);
    $node->save();
    $node->addTranslation('de', ['title' => 'German', 'status' => 1])->save();

    $query = $this->getQueryFromFile('translatable.gql');
    $metadata = $this->defaultCacheMetaData();
    $metadata->addCacheContexts(['user.node_grants:view', 'static:language:de', 'static:language:en']);
    $metadata->addCacheTags(['node:1', 'node_list']);

    $this->assertResults($query, ['id' => $node->uuid() . ':de'], [
      '_loadPage' => [
        "title" => "German"
      ],
      '_queryPages' => [
        [
          '_id' => $node->uuid() . ':de',
          '_drupalId' => $node->uuid(),
          '_translations' => [
            [
              '_defaultTranslation' => false,
              '_langcode' => 'de',
              'title' => 'German',
            ]
          ],
        ],
      ],
    ], $metadata);

    $metadata = $this->defaultCacheMetaData();
    $metadata->addCacheContexts(['user.node_grants:view', 'static:language:de', 'static:language:en']);
    $metadata->addCacheTags(['node:1', 'node_list']);
    $this->assertResults($query, ['id' => $node->uuid() . ':en'], [
      '_loadPage' => NULL,
      '_queryPages' => [
        [
          '_id' => $node->uuid() . ':de',
          '_drupalId' => $node->uuid(),
          '_translations' => [
            [
              '_defaultTranslation' => false,
              '_langcode' => 'de',
              'title' => 'German',
            ]
          ],
        ],
      ],
    ], $metadata);
  }

  public function testCreatePageFields() {
    $regular = Node::create([
      'type' => 'blog',
      'title' => 'Regular',
      'promote' => 0,
    ]);
    $regular->save();
    $promoted = Node::create([
      'type' => 'blog',
      'title' => 'Promoted',
      'promote' => 1,
    ]);
    $promoted->save();

    $query = $this->getQueryFromFile('create-page-fields.gql');
    $metadata = $this->defaultCacheMetaData();
    $metadata->addCacheTags(['node:1', 'node:2']);
    $this->assertResults($query, [], [
      'regular' => [
        'title' => 'Regular',
        'path' => '/node/1',
        'template' => null,
      ],
      'promoted' => [
        'title' => 'Promoted',
        'path' => '/node/2',
        'template' => 'blog-promoted',
      ],
    ], $metadata);
  }

  public function testRevisionable() {
    $node = Node::create([
      'type' => 'blog',
      'title' => 'Revision 1'
    ]);
    $node->save();
    $node->set('title', 'Revision 2');
    $node->setNewRevision();
    $node->save();

    $query = $this->getQueryFromFile('revisionable.gql');
    $metadata = $this->defaultCacheMetaData();
    $metadata->addCacheTags(['node:1']);
    $this->assertResults($query, [], [
      'a' => [
        'title' => 'Revision 1',
      ],
      'b' => [
        'title' => 'Revision 2',
      ],
    ], $metadata);
  }

  public function testMultilingualRevisionable() {
    $node = Node::create([
      'type' => 'page',
      'title' => 'Revision 1'
    ]);
    $node->save();
    $node->setNewRevision();
    $translation = $node->addTranslation('de', ['title' => 'Revision 1 German', 'status' => 1]);
    $translation->save();


    $translation->set('title', 'Revision 2 German');
    $translation->setNewRevision();
    $translation->save();

    $query = $this->getQueryFromFile('revisionable-translatable.gql');
    $metadata = $this->defaultCacheMetaData();
    $metadata->addCacheTags(['node:1']);
    $metadata->addCacheContexts(['static:language:de']);
    $this->assertResults($query, [], [
      'a' => [
        'title' => 'Revision 1',
      ],
      'b' => null,
      'c' => [
        'title' => 'Revision 1 German',
      ],
      'd' => [
        'title' => 'Revision 2 German',
      ],
    ], $metadata);
  }

  public function testUnpublishedRevision() {
    $node = Node::create([
      'type' => 'blog',
      'title' => 'Revision 1',
      'status' => 0,
    ]);
    $node->save();
    $node->setNewRevision();
    $node->set('title', 'Revision 2');
    $node->set('status', 1);
    $node->save();

    $query = $this->getQueryFromFile('revisionable.gql');
    $metadata = $this->defaultCacheMetaData();
    $metadata->addCacheTags(['node:1']);
    $this->assertResults($query, [], [
      'a' => null,
      'b' => [
        'title' => 'Revision 2',
      ],
    ], $metadata);
  }

  public function testUnpublishedMultilingualRevisionable() {
    $node = Node::create([
      'type' => 'page',
      'title' => 'Revision 1',
      'status' => 0,
    ]);
    $node->save();
    $node->setNewRevision();
    $translation = $node->addTranslation('de', ['title' => 'Revision 1 German', 'status' => 1]);
    $translation->save();


    $translation->set('title', 'Revision 2 German (Draft)');
    $translation->set('status', 0);
    $translation->setNewRevision();
    $translation->save();

    $query = $this->getQueryFromFile('revisionable-translatable.gql');
    $metadata = $this->defaultCacheMetaData();
    $metadata->addCacheTags(['node:1']);
    $metadata->addCacheContexts(['static:language:de']);
    $this->assertResults($query, [], [
      'a' => null,
      'b' => null,
      'c' => [
        'title' => 'Revision 1 German',
      ],
      'd' => null,
    ], $metadata);
  }

  public function testLoadById() {
    $node = Node::create([
      'type' => 'page',
      'title' => 'Test page'
    ]);
    $node->save();
    $metadata = $this->defaultCacheMetaData();
    $metadata->addCacheTags(['node:1']);
    $query = $this->getQueryFromFile('load-entity.gql');
    $this->assertResults($query, ['input' => '1:en'], [
      '_loadPage' => [
        'title' => 'Test page',
      ],
    ], $metadata);
  }

  public function testLoadByUuid() {
    $node = Node::create([
      'type' => 'page',
      'title' => 'Test page'
    ]);
    $node->save();
    $metadata = $this->defaultCacheMetaData();
    $metadata->addCacheTags(['node:1']);
    $query = $this->getQueryFromFile('load-entity.gql');
    $this->assertResults($query, ['input' => $node->uuid() . ':en'], [
      '_loadPage' => [
        'title' => 'Test page',
      ],
    ], $metadata);
  }

  public function testLoadByInternalPath() {
    $node = Node::create([
      'type' => 'page',
      'title' => 'Test page'
    ]);
    $node->save();
    $metadata = $this->defaultCacheMetaData();
    $metadata->addCacheTags(['node:1']);
    $query = $this->getQueryFromFile('load-entity.gql');
    $this->assertResults($query, ['input' => '/node/1:en'], [
      '_loadPage' => [
        'title' => 'Test page',
      ],
    ], $metadata);
  }

  public function testLoadByAliasedPath() {
    $node = Node::create([
      'type' => 'page',
      'title' => 'Test page'
    ]);
    $node->save();
    $this->createPathAlias('/node/1', '/test');
    $metadata = $this->defaultCacheMetaData();
    $metadata->addCacheTags(['node:1']);
    $query = $this->getQueryFromFile('load-entity.gql');
    $this->assertResults($query, ['input' => '/test:en'], [
      '_loadPage' => [
        'title' => 'Test page',
      ],
    ], $metadata);
  }
}
