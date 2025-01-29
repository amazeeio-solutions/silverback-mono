# Silverback Gutenberg

Helps integrating Drupal's
[Gutenberg module](https://www.drupal.org/project/gutenberg) into Silverback
projects.

## GraphQL directives

This module provides a set of GraphQL directives that are picked up by the
`amazeelabs/graphql_directives` module. This allows to easily expose Gutenberg
blocks through a GraphQL schema.

### `@resolveEdtiorBlocks`

Parse the raw output of a field at a given path and expose its content as
structured block data. Allows to define `aggregated` and `ignored` blocks:

- `aggregated`: All subsequent blocks of these types will be merged into one
  `core/paragraph` block. In Gutenberg, standard HTML elements like lists,
  headings or tables are represented as separate blocks. This directive allows
  to merge them into one and simplify handling in the frontend.
- `ignored`: Blocks of these types will be ignored. This is useful for blocks
  that are not relevant for the frontend, like the `core/group` block. The block
  will simply not part of the result and any children are spread where the block
  was.

```graphql
type Page {
  title: String! @resolveProperty(path: "title.value")
  content: [Blocks!]!
    @resolveEditorBlocks(
      path: "body.value"
      aggregated: ["core/paragraph", "core/list"]
      ignored: ["core/group"]
    )
}
```

### `@resolveEditorBlockType`

Retrieve the type of gutenberg block. Useful for resolving types of a block
union.

```graphql
union Blocks @resolveEditorBlockType = Paragraph | Heading | List
```

### `@resolveEditorBlockMarkup`

Extract inner markup of a block that was provided by the user via rich HTML.

```graphql
type Text @type(id: "core/paragraph") {
  content: String @resolveEditorBlockMarkup
}
```

### `@resolveEditorBlockAttribute`

Retrieve a specific attribute, stored in a block.

```graphql
type Figure @type(id: "custom/figure") {
  caption: String @resolveEditorBlockAttribute(key: "caption")
}
```

### `@resolveEditorBlockMedia`

Resolve a media entity referenced in a block.

```graphql
type Figure @type(id: "custom/figure") {
  image: Image @resolveEditorBlockMedia
}
```

### `@resolveEditorBlockChildren`

Extract all child blocks of a given block.

```graphql
type Columns @type(id: "custom/columns") {
  columns: [ColumnBlocks!]! @resolveEditorBlockChildren
}
```

## LinkProcessor

The main idea is that all links added to a Gutenberg page are

- kept in internal format (e.g. `/node/123`) when saved to Drupal database
- processed to language-prefixed aliased form (e.g. `/en/my-page`) when
  - they are displayed in Gutenberg editor
  - they are sent out via GraphQL

This helps to

- always display fresh path aliases
- be sure that the language prefix is correct
- update link URLs when translating content (e.g. `/en/my-page` will become
  `/fr/ma-page` automatically because it's `/node/123` under the hood)
- keep track of entity usage (TBD)

### Implementation

The module does most of the things automatically. Yet there are few things
developers should take care of.

First, custom Gutenberg blocks which store links in block attributes should
implement `hook_silverback_gutenberg_link_processor_block_attrs_alter`. See
[`silverback_gutenberg.api.php`](./silverback_gutenberg.api.php) for an example.

Next, GraphQL resolvers which parse Gutenberg code should call
`LinkProcessor::processLinks` before parsing the blocks. See
[`DataProducer/Gutenberg.php`](../../../../apps/silverback-drupal/web/modules/custom/silverback_gatsby_test/src/Plugin/GraphQL/DataProducer/Gutenberg.php)
for an example.

## Validation

Custom validator plugins can be created in
`src/Plugin/Validation/GutenbergValidator`

### Field level validation

Example: to validate that an email is valid and required.

- the block name is `custom/my-block`
- the field attribute is `email` and the label `Email`

```php
<?php

namespace Drupal\custom_gutenberg\Plugin\Validation\GutenbergValidator;

use Drupal\silverback_gutenberg\GutenbergValidation\GutenbergValidatorBase;
use Drupal\Core\StringTranslation\StringTranslationTrait;

/**
 * @GutenbergValidator(
 *   id="my_block_validator",
 *   label = @Translation("My block validator")
 * )
 */
class MyBlockValidator extends GutenbergValidatorBase {

  use StringTranslationTrait;

  /**
   * {@inheritDoc}
   */
  public function applies(array $block) {
    return $block['blockName'] === 'custom/my-block';
  }

  /**
   * {@inheritDoc}
   */
  public function validatedFields(array $block = []) {
    return [
      'email' => [
        'field_label' => $this->t('Email'),
        'rules' => ['required', 'email'],
      ],
    ];
  }

}
```

### Block level validation

Perform custom block validation logic then return the result.

```php
public function validateContent(array $block) {
  $isValid = TRUE;

  // Custom validation logic.
  // (...)

  if (!$isValid) {
    return [
      'is_valid' => FALSE,
      'message' => 'Message',
    ];
  }

  // Passes validation.
  return [
    'is_valid' => TRUE,
    'message' => '',
  ];
}
```

### Cardinality validation

#### Backend

Uses the `validateContent()` method as a wrapper, with the cardinality validator
trait.

```php
use GutenbergCardinalityValidatorTrait;
```

Validate a given block type for inner blocks.

```php
public function validateContent(array $block) {
  $expectedChildren = [
    [
      'blockName' => 'custom/teaser',
      'blockLabel' => $this->t('Teaser'),
      'min' => 1,
      'max' => 2,
    ],
  ];
  return $this->validateCardinality($block, $expectedChildren);
}
```

Validate any kind of block type for inner blocks.

```php
public function validateContent(array $block) {
  $expectedChildren = [
    'validationType' => GutenbergCardinalityValidatorInterface::CARDINALITY_ANY,
    'min' => 0,
    'max' => 1,
  ];
  return $this->validateCardinality($block, $expectedChildren);
}
```

Validate a minimum with no maximum.

```php
public function validateContent(array $block) {
  $expectedChildren = [
    [
      'blockName' => 'custom/teaser',
      'blockLabel' => $this->t('Teaser'),
      'min' => 1,
      'max' => GutenbergCardinalityValidatorInterface::CARDINALITY_UNLIMITED,
    ],
  ];
  return $this->validateCardinality($block, $expectedChildren);
}
```

#### Client side alternative

Client side cardinality validation can also be done in custom blocks with this
pattern.

- use `getBlockCount`
- remove the `InnerBlocks` appender when the limit is reached

```tsx
/* global Drupal */
import { registerBlockType } from 'wordpress__blocks';
import { InnerBlocks } from 'wordpress__block-editor';
import { useSelect } from 'wordpress__data';

// @ts-ignore
const __ = Drupal.t;

const MAX_BLOCKS: number = 1;

registerBlockType('custom/my-block', {
  title: __('My Block'),
  icon: 'location',
  category: 'layout',
  attributes: {},
  edit: (props) => {
    const { blockCount } = useSelect((select) => ({
      blockCount: select('core/block-editor').getBlockCount(props.clientId),
    }));
    return (
      <div>
        <InnerBlocks
          templateLock={false}
          renderAppender={() => {
            if (blockCount >= MAX_BLOCKS) {
              return null;
            } else {
              return <InnerBlocks.ButtonBlockAppender />;
            }
          }}
          allowedBlocks={['core/block']}
          template={[]}
        />
      </div>
    );
  },
  save: () => {
    return <InnerBlocks.Content />;
  },
});
```

## Linkit integration

To enable the integration:

- Enable the linkit module and create a linkit profile with `gutenberg` machine
  name
    <details>
      <summary>This brings</summary>

  - Basic linkit integration
  - Improved suggestion labels (e.g. `Content: Page`, `Media: PDF` instead of
    `page`, `pdf`)

  </details>

- Add `Silverback:` prefixed matchers to the profile
  <details> <summary>How they differ from the default linkit matchers</summary>

  - Suggestions order is done by the position of the search string in the label.
    For example, if you search for "best", the order will be:
    - _Best_ in class
    - The _best_ choice
    - Always choose _best_
  - Improved display of translated content. By default, linkit searches through
    all content translations but displays suggestions in the current language.
    Which can be confusing. The Silverback matchers changes this a bit. If the
    displayed item does not contain the prompt, a translation containing the
    prompt will be added in the brackets. For example, if you search for "gift"
    with the English UI, the suggestions will look like this:

    - _Gift_ for a friend
    - Poison for an enemy (_Gift_ für einen Feind)
    </details>

  - To use a different profile when using the LinkControl component, add the
    machine name of the profile to the `subtype` query parameter in the
    component prop `suggestionsQuery` like below, where the custom linkit
    profile is called `customer`.

  ```
  <DrupalLinkControl
    searchInputPlaceholder={__('Target page')}
    value={{
      url: props.attributes.linkUrl,
    }}
    settings={[]}
    suggestionsQuery={{
      // Use the custom linkit profile called customer.
      subtype: 'customer',
    }}
    onChange={(link) => {
      props.setAttributes({
        linkUrl: link.url,
      });
    }}
  />
  ```

## Gutenberg block mutator

Entity id references can be used as Gutenberg attributes.

When using default content, we need to map the entity id with the uuid:

- id to uuid on export
- uuid to id on import

This is especially useful for schema tests, when using entity reference.

To facilitate this process, block mutator plugins can be used, the easiest way
is to extend the `EntityBlockMutatorBase` base class.

Example, with multi-valued Gutenberg attribute

```php
<?php

namespace Drupal\silverback_gutenberg\Plugin\GutenbergBlockMutator;

use Drupal\silverback_gutenberg\Attribute\GutenbergBlockMutator;
use Drupal\silverback_gutenberg\BlockMutator\EntityBlockMutatorBase;
use Drupal\Core\StringTranslation\TranslatableMarkup;

#[GutenbergBlockMutator(
  id: "media_block_mutator",
  label: new TranslatableMarkup("Media IDs to UUIDs and viceversa."),
)]
class MediaBlockMutator extends EntityBlockMutatorBase {

  /**
   * {@inheritDoc}
   */
  public bool $isMultiple = TRUE;

  /**
   * {@inheritDoc}
   */
  public string $gutenbergAttribute = 'mediaEntityIds';

  /**
   * {@inheritDoc}
   */
  public string $entityTypeId = 'media';

}
```

Example, with single-valued Gutenberg attribute

```php
<?php

namespace Drupal\silverback_gutenberg\Plugin\GutenbergBlockMutator;

use Drupal\silverback_gutenberg\Attribute\GutenbergBlockMutator;
use Drupal\silverback_gutenberg\BlockMutator\EntityBlockMutatorBase;
use Drupal\Core\StringTranslation\TranslatableMarkup;

#[GutenbergBlockMutator(
  id: "node_block_mutator",
  label: new TranslatableMarkup("Node ID to UUID and viceversa."),
)]
class NodeBlockMutator extends EntityBlockMutatorBase {

  /**
   * {@inheritDoc}
   */
  public string $gutenbergAttribute = 'nodeId';

  /**
   * {@inheritDoc}
   */
  public string $entityTypeId = 'node';

}
```
