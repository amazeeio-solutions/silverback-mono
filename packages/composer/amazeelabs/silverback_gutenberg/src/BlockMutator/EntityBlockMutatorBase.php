<?php

namespace Drupal\silverback_gutenberg\BlockMutator;

use Drupal\Core\Entity\ContentEntityInterface;
use Drupal\Core\Entity\EntityRepositoryInterface;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Logger\LoggerChannelFactoryInterface;
use Drupal\Core\Plugin\ContainerFactoryPluginInterface;
use Drupal\Core\Plugin\PluginBase;
use Symfony\Component\DependencyInjection\ContainerInterface;

abstract class EntityBlockMutatorBase extends PluginBase implements
  BlockMutatorInterface,
  ContainerFactoryPluginInterface {

  /**
   * The Gutenberg attribute id.
   *
   * @var string $gutenbergAttribute
   */
  public string $gutenbergAttribute;

  /**
   * Indicates if the Gutenberg attribute is a collection or a single value.
   *
   * @var bool $isMultiple
   */
  public bool $isMultiple = FALSE;

  /**
   * The Drupal entity type id.
   *
   * @var string $entityTypeId
   */
  public string $entityTypeId;

  /**
   * EntityBlockMutatorBase constructor.
   *
   * @param \Drupal\Core\Entity\EntityRepositoryInterface $repository
   */
  public function __construct(
    array $configuration,
          $plugin_id,
          $plugin_definition,
    private readonly EntityRepositoryInterface $entityRepository,
    private readonly EntityTypeManagerInterface $entityTypeManager,
    private readonly LoggerChannelFactoryInterface $loggerFactory,
  ) {
    parent::__construct($configuration, $plugin_id, $plugin_definition);
  }

  /**
   * {@inheritDoc}
   */
  public static function create(ContainerInterface $container, array $configuration, $plugin_id, $plugin_definition): static {
    return new static(
      $configuration,
      $plugin_id,
      $plugin_definition,
      $container->get('entity.repository'),
      $container->get('entity_type.manager'),
      $container->get('logger.factory'),
    );
  }

  /**
   * {@inheritDoc}
   */
  public function applies(array $block) : bool {
    if (empty($this->gutenbergAttribute)) {
      $this->loggerFactory->get('silverback_gutenberg')->warning(
        $this->t('Block mutator attribute is not set for @class, ignoring.', [
          '@class' => self::class,
        ])
      );
      return FALSE;
    }

    if (empty($this->entityTypeId)) {
      $this->loggerFactory->get('silverback_gutenberg')->warning(
        $this->t('Block mutator attribute @attribute does not specifiy the entity type id for @class, ignoring.', [
          '@attribute' => $this->gutenbergAttribute,
          '@class' => self::class,
        ])
      );
      return FALSE;
    }

    $entityTypes = $this->entityTypeManager->getDefinitions();
    if (!array_key_exists($this->entityTypeId, $entityTypes)) {
      throw new \Exception(
        $this->t('Block mutator attribute @attribute does not have a valid entity type @entity_type_id for @class, ignoring.', [
          '@attribute' => $this->gutenbergAttribute,
          '@entity_type_id' => $this->entityTypeId,
          '@class' => self::class,
        ])
      );
    }

    if (empty($block['attrs'][$this->gutenbergAttribute])) {
      return FALSE;
    }

    if (
      $this->isMultiple &&
      !is_array($block['attrs'][$this->gutenbergAttribute])
    ) {
      throw new \Exception(
        $this->t('Block mutator attribute @attribute is set to be multiple but is not iterable.', [
          '@attribute' => $this->gutenbergAttribute,
        ])
      );
    }

    return TRUE;
  }

  /**
   * {@inheritDoc}
   */
  public function mutateExport(array &$block, array &$dependencies) : void {
    if ($this->isMultiple) {
      $block['attrs'][$this->gutenbergAttribute] = array_values(array_map(
        function (ContentEntityInterface $entity) use (&$dependencies) {
          $dependencies[$entity->uuid()] = $this->entityTypeId;
          return $entity->uuid();
        },
        $this->entityRepository
          ->getCanonicalMultiple($this->entityTypeId, $block['attrs'][$this->gutenbergAttribute])
      ));
    } else {
      $entity = $this->entityRepository->getCanonical($this->entityTypeId, $block['attrs'][$this->gutenbergAttribute]);
      if (!$entity instanceof ContentEntityInterface) {
        $block['attrs'][$this->gutenbergAttribute] = '';
        return;
      }
      $block['attrs'][$this->gutenbergAttribute] = $entity->uuid();
      $dependencies[$entity->uuid()] = $this->entityTypeId;
    }
  }

  /**
   * {@inheritDoc}
   */
  public function mutateImport(array &$block) : void {
    if ($this->isMultiple) {
      $block['attrs'][$this->gutenbergAttribute] = array_map(
        function (string $uuid) {
          try {
            $entity = $this->entityRepository->loadEntityByUuid($this->entityTypeId, $uuid);
            return $entity->id();
          }
          catch (\Throwable $e) {
            $this->loggerFactory->get('silverback_gutenberg')->warning(
              $this->t(
                '@class: Could not load @entity_type_id by uuid @uuid on import.', [
                  '@class' => self::class,
                  '@entity_type_id' => $this->entityTypeId,
                  '@uuid' => $uuid,
                ]
              )
            );
            return $uuid;
          }
        },
        $block['attrs'][$this->gutenbergAttribute]
      );
    } else {
      try {
        $entity = $this->entityRepository->loadEntityByUuid($this->entityTypeId, $block['attrs'][$this->gutenbergAttribute]);
        $block['attrs'][$this->gutenbergAttribute] = $entity->id();
      }
      catch (\Throwable $e) {
        $this->loggerFactory->get('silverback_gutenberg')->warning(
          $this->t(
            '@class: Could not load @entity_type_id by uuid @uuid on import.', [
              '@class' => self::class,
              '@entity_type_id' => $this->entityTypeId,
              '@uuid' => $uuid,
            ]
          )
        );
      }
    }
  }

}
