<?php

namespace Drupal\silverback_external_preview;

use Drupal\Core\Config\ConfigFactoryInterface;
use Drupal\Core\Entity\ContentEntityInterface;
use Drupal\Core\Entity\EntityMalformedException;
use Drupal\Core\Entity\EntityPublishedInterface;
use Drupal\Core\Entity\Exception\UndefinedLinkTemplateException;
use Drupal\Core\Entity\RevisionableStorageInterface;
use Drupal\Core\Entity\TranslatableRevisionableStorageInterface;
use Drupal\Core\Language\LanguageInterface;
use Drupal\Core\Routing\RouteMatchInterface;
use Drupal\Core\StringTranslation\StringTranslationTrait;
use Drupal\Core\Url;
use Drupal\path_alias\AliasManager;

/**
 * Provides some consumer preview link.
 */
class ExternalPreviewLink {

  use StringTranslationTrait;

  /**
   * The consumer preview links.
   *
   * @var \Drupal\path_alias\AliasManager
   */
  protected $pathAliasManager;

  /**
   * @var \Drupal\Core\Entity\EntityTypeManager
   */
  protected $entityTypeManager;

  /**
   * @var \Drupal\Core\TempStore\PrivateTempStore
   */
  protected $tempstore;

  /**
   * @var \Drupal\Core\Extension\ModuleHandlerInterface
   */
  protected $moduleHandler;

  /** @var \Drupal\Core\Language\LanguageManager */
  protected $languageManager;

  /** @var string */
  protected $previewHost;

  /** @var string */
  protected $liveHost;
  /**
   * Controller constructor.
   *
   * @param \Drupal\path_alias\AliasManager
   *   The consumer preview links.
   */
  public function __construct(AliasManager $pathAliasManager, $entityTypeManager, $tempstore, $moduleHandler, $languageManager, ConfigFactoryInterface $configFactory) {
    $moduleConfig = $configFactory->get('silverback_external_preview.settings');

    $this->pathAliasManager = $pathAliasManager;
    $this->entityTypeManager = $entityTypeManager;
    $this->tempstore = $tempstore;
    $this->moduleHandler = $moduleHandler;
    $this->languageManager = $languageManager;
    $this->previewHost = $moduleConfig->get('preview_host');
    $this->liveHost = $moduleConfig->get('live_host');
  }


  /**
   * Returns a preview link for an entity
   *
   * @param \Drupal\Core\Routing\RouteMatchInterface $route
   *
   * @return \Drupal\Core\Url|null
   */
  public function getPreviewUrl(
    RouteMatchInterface $routeMatch
  ) {
    return $this->getExternalUrl($routeMatch, $this->previewHost);
  }

  /**
   * Returns a live preview link for an entity
   *
   * @param \Drupal\Core\Routing\RouteMatchInterface $route
   *
   * @return \Drupal\Core\Url|null
   */
  public function getLiveUrl(
    RouteMatchInterface $routeMatch
  ) {
    return $this->getExternalUrl($routeMatch, $this->liveHost);
  }

  /*
   * Returns the preview base url from the env variable.
   *
   * @return string
   * @throws \Exception
   */
  public function getPreviewBaseUrl() {
    if ($this->previewHost) {
      return rtrim($this->previewHost, '/');
    }
    else {
      throw new \Exception('preview_host config is not set.');
    }
  }

  /*
   * Returns the live base url from the env variable.
   *
   * @return string
   * @throws \Exception
   */
  public function getLiveBaseUrl() {
    if ($this->liveHost) {
      return rtrim($this->liveHost, '/');
    }
    else {
      throw new \Exception('live_host config is not set.');
    }
  }

  /**
   * Used to create an external Url object for a given path.
   *
   * @param string $path
   * @param string $external_url_type
   *
   * @return \Drupal\Core\Url
   */
  public function createPreviewUrlFromPath(string $path, $external_url_type = 'preview') {
    $base_url = $external_url_type === 'preview' ? $this->getPreviewBaseUrl() : $this->getLiveBaseUrl();
    return Url::fromUri($base_url . $path, $this->getUrlOptions($external_url_type));
  }

  /**
   * Used to create a external Url object for a given content entity.
   *
   * @param ContentEntityInterface $entity
   * @param string $external_url_type
   *
   * @return \Drupal\Core\Url|null
   */
  public function createPreviewUrlFromEntity(ContentEntityInterface $entity, $external_url_type = 'preview') {
    if ($this->isUnpublished($entity)) {
      return $this->getUnpublishedPreviewUrl($entity);
    }
    elseif ($this->isNodeRevisionRoute()) {
      return $this->getRevisionPreviewUrl($entity);
    }
    else {
      try {
        $path = $entity->toUrl('canonical')->toString(TRUE)->getGeneratedUrl();
        $base_url = $external_url_type === 'preview' ? $this->getPreviewBaseUrl() . '/__preview/' . $entity->bundle() : $this->getLiveBaseUrl() . $path;
        $url_object = Url::fromUri($base_url, $this->getUrlOptions($external_url_type, $entity));
        // Allow for altering the url object via a hook.
        $this->moduleHandler->alter('silverback_external_preview_entity_url', $entity, $url_object);
        return $url_object;
      } catch (UndefinedLinkTemplateException|EntityMalformedException $e) {
        return NULL;
      }
    }
  }

  public function isUnpublished(ContentEntityInterface $entity) {
    return $entity instanceof EntityPublishedInterface && !$entity->isPublished();
  }

  private function getUnpublishedPreviewUrl(ContentEntityInterface $entity) {
    return Url::fromUri(
      $this->buildEntityPreviewUri($entity),
      [
        'query' => $this->buildPreviewQuery($entity)
      ]
    );
  }

  public function isNodeRevisionRoute() {
    $route_name = \Drupal::routeMatch()->getRouteName();
    $node_revision_routes = [
      'entity.node.revision',
      'entity.node.latest_version',
    ];
    return in_array($route_name, $node_revision_routes);
  }

  private function getRevisionPreviewUrl(ContentEntityInterface $entity) {
    $entity_type_id = $entity->getEntityTypeId();
    $storage = $this->entityTypeManager->getStorage($entity_type_id);
    if (!$storage instanceof RevisionableStorageInterface) {
      throw new \Exception('Entity type ' . $entity->getEntityTypeId() . ' is not revisionable.');
    }

    $route_match = \Drupal::routeMatch();
    if ($route_match->getRouteName() === 'entity.node.revision') {
      /** @var \Drupal\node\NodeInterface $node_revision */
      $revision = $route_match->getParameter('node_revision');
      $revision_id = $revision->getRevisionId();
    }
    elseif ($route_match->getRouteName() === 'entity.node.latest_version') {
      if ($entity->isTranslatable() && $storage instanceof TranslatableRevisionableStorageInterface) {
        // The latest revision for the requested language.
        $requestedLanguageId = $this->languageManager->getCurrentLanguage(LanguageInterface::TYPE_CONTENT)->getId();
        $revision_id = $storage->getLatestTranslationAffectedRevisionId($entity->id(), $requestedLanguageId);
      }
      if (empty($revision_id)) {
        // Otherwise, just the latest revision.
        $revision_id = $storage->getLatestRevisionId($entity->id());
      }
    }
    else {
      throw new \Exception('Only node routes are currently supported for revision preview url.');
    }

    return Url::fromUri(
      $this->buildEntityPreviewUri($entity),
      [
        'query' => $this->buildPreviewQuery($entity, $revision_id)
      ]
    );
  }

  private function buildEntityPreviewUri(ContentEntityInterface $entity) {
    //all preview displays should go to [external_preview_host]/__preview/[bundle machine name]?nid=1&rid=1&lang=en
    $uri_parts = [ $this->getPreviewBaseUrl() ];
    $uri_parts[] = '__preview';
    $uri_parts[] = $entity->bundle();
    return implode('/', $uri_parts);
  }

  private function getUrlOptions($external_url_type = 'preview', ContentEntityInterface $entity = NULL) {
    $result = [];
    if ($external_url_type === 'preview') {
      $result['query'] = $this->buildPreviewQuery($entity);
    }
    return $result;
  }

  private function buildPreviewQuery(ContentEntityInterface $entity, $revision_id = NULL) {
    return [
      'nid' => $entity->id(),
      'rid' => $revision_id ?? $entity->getRevisionId(),
      'lang' => $entity instanceof ContentEntityInterface && $entity->isTranslatable() ? $entity->language()->getId() : $this->languageManager->getCurrentLanguage()->getId(),
    ];
  }

  /**
   * Returns a Url object with the concatenated base url and alias.
   *
   * @param \Drupal\Core\Routing\RouteMatchInterface $route
   * @param string $envVarName
   *
   * @return \Drupal\Core\Url|null
   * @throws \Drupal\Component\Plugin\Exception\PluginNotFoundException
   */
  protected function getExternalUrl(RouteMatchInterface $route, string | null $base_url) {
    if ($base_url) {
      $url_object = &drupal_static(__FUNCTION__, NULL);
      if (!empty($url_object)) {
        return $url_object;
      }
      $entity = $this->getPageEntity($route);
      // At the moment we support only content entity types. Because there was
      // an error on the field edit routes (e.g. on
      // "/admin/structure/types/manage/foo/fields/node.foo.field_bar"):
      // No link template 'edit-form' found for the 'field_config' entity type
      if ($entity instanceof ContentEntityInterface) {

        $external_url_type = $base_url === $this->previewHost ? 'preview' : 'live';
        $url_object = $this->createPreviewUrlFromEntity($entity, $external_url_type);
        $id = $this->getEntityTempStoreId($entity);
        // Make this accessible via admin path
        $tempstore = $this->tempstore->get('silverback_external_preview');
        $tempstore->set($id, $url_object);
      }
      // Allow for altering the url object via a hook
      $this->moduleHandler->alter('silverback_external_preview_url', $route, $url_object);
    }

    return $url_object ?? NULL;
  }

  public function getEntityTempStoreId(ContentEntityInterface $entity) {
    $id_parts = [$entity->getEntityTypeId(), $entity->id()];
    if ($entity->hasField('langcode') && !$entity->get('langcode')->isEmpty()) {
      $id_parts[] = $entity->get('langcode')->value;
    }
    return implode(':', $id_parts);
  }

  /**
   * Gets the current page main entity.
   *
   * @param \Drupal\Core\Routing\RouteMatchInterface $route
   *
   * @return array|\Drupal\Core\Entity\EntityInterface|mixed|null
   * @throws \Drupal\Component\Plugin\Exception\InvalidPluginDefinitionException
   * @throws \Drupal\Component\Plugin\Exception\PluginNotFoundException
   */
  protected function getPageEntity(RouteMatchInterface $route) {

    $params = $route->getParameters()->all();

    $types = array_keys(\Drupal::entityTypeManager()->getDefinitions());

    $page_entity = NULL;

    foreach ($types as $type) {
      if (!empty($params[$type])) {
        // Load entity if available and return it
        return $params[$type];

      }
    }

    return $page_entity;
  }

}
