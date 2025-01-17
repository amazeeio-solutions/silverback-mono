# GraphQL Directives

A directive-based approach to GraphQL schema implementations. Provides a
'Directable' schema plugin that loads a GraphQL schema definition file and
implements it using directive plugins.

## Usage

Create a GraphQL schema definition file, and annotate it with directives.

```graphql
type Query {
  hello: String @value(string: "Hello world!")
}
```

Configure a GraphQL server with the "Directable" schema plugin, and set the
schema definition path to the created schema file.

Directive definitions will be automatically prepended to the schema. To support
IDE's with autocompletion and syntax checking, there is a `drush` command to
generate a schema file with all directives and information where they are
implemented.

```shell
drush graphql:directives >> directives.graphqls
```

### Chaining

Directives can be chained to combine reusable data producers. They are composed
from left to right, meaning the output of the left directive is passed as parent
value to its right neighbour.

```graphql
type Query {
  # This will emit "three".
  list: String! @value(json: "[\"one\", \"two\", \"three\"]") @seek(pos: 2)
}
```

### Mapping

The `@map` directive allows to map over the output of its left neighbour and
apply all directives on the right side to each item.

```graphql
type Query {
  # This will emit ["a", "b"].
  map: [String!]!
    @value(json: "[{\"x\": \"a\"},{\"x\": \"b\"}]")
    @map
    @prop(key: "x")
}
```

### Default values

Since Drupal's data structures can't guarantee integrity, the graphql schema
will enforce default values as much as possible. Whenever a type is used in a
non-nullable position (no `!` at the end ), it attempts to apply a default value
if the value is `null`. The default value is determined by the type, e.g. `0`
for `Int`, `false` for `Boolean`, `""` for `String` and `[]` for list types like
`[String!]!`.

For custom types, interface, unions or scalars, the `@default` directive can be
used to start a directive chain that generates a default value.

```graphql
scalar MyScalar @default @value(string: "bar")

type Query {
  # This will emit `''`.
  string: String! @value
  # This will emit `0`.
  int: Int! @value
  # This will emit `[]`.
  list: [String!]! @value
  # This will emit `bar`
  manual: MyScalar! @value
}
```

### Type resolution

Directives can also be used to resolve the runtime types of unions and
interfaces. To do that, apply any directives that can be used to resolve field
values to the interface or union. The chain of directives should resolve to a
string value which will be treated as a type id.

```graphql
union Letters @prop(key: "type") = A | B
```

This resolved type id will then be matched against object types annotated with
the `@type` directive to retrieve the actual type.

```graphql
type A @type(id: "a") {
  type: String!
}

type B @type(id: "b") {
  type: String!
}
```

## Argument handling

Directives can use the `ArgumentTrait` to apply dynamic arguments. If the
directive argument equals `$`, the current value will be passed as the argument
value. If its `$`, followed by any characters, these characters will be used as
a key to retrieve the value from the current query arguments.

Arguments that implement this behaviour are marked to be (dynamic).

```graphql
type Query {
  static: Post @loadEntity(type: "node", id: "1")
  parent: Post @value(int: 1) @loadEntity(type: "node", id: "$")
  argument(id: String!): Post @loadEntity(type: "node", id: "$id")
}
```

## Directives

### `@value`

The `@value` directive allows you to define a static value for a field as
primitive or a JSON encoded string. Without any arguments, it will emit `null`.

```graphql
type Query {
  null: String @value
  hello: String! @value(string: "Hello world!")
  theAnswer: Int! @value(int: 42)
  pi: Float! @value(float: 3.14)
  true: Boolean! @value(float: true)
  object: MyType! @value(json: "{\"foo\":\"bar\"}")
}
```

### `@seek`

Extracts a value from a list or iterable. The `pos` argument marks the target
position.

```graphql
type Query {
  # This will emit "three".
  list: String! @value(json: "[\"one\", \"two\", \"three\"]") @seek(pos: 2)
}
```

### `@prop`

Extracts a property from an object or map. The `key` argument marks the target
key.

```graphql
type Query {
  # This will emit "bar".
  prop: String! @value(json: "{\"foo\": \"bar\"}") @prop(key: "foo")
}
```

### `@map`

Iterate over the current result list and apply the following directives to each
item.

```graphql
type Query {
  # This will emit ["a", "b"].
  map: [String!]!
    @value(json: "[{\"x\": \"a\"},{\"x\": \"b\"}]")
    @map
    @prop(key: "x")
}
```

### `@type`

Annotate an object type with a specific id that will be used for interface- and
union type resolution.

```graphql
union Letters @prop(key: "type") = A | B

type A @type(id: "a") {
  type: String!
}

type B @type(id: "b") {
  type: String!
}
```

### `@arg`

Retrieve an arguments value and inject it as the current value that will be
passed as parent to subsequent directives.

```graphql
type Query {
  post(path: String!): Page @arg(name: "path") @route(path: "$") @loadEntity
}
```

### `@route`

Resolve a path (dynamic) to a Drupal `Url` object.

```graphql
type Query {
  post(path: String!): Page @route(path: "$path") @loadEntity
}
```

### `@loadEntity`

Load Drupal entities in various ways. If there are no arguments, it assumes that
the parent value contains a `Url` object generated by `@route`, and it attempts
to load the entity from there.

If used with `id ` or `uuid`, an optional `operation` argument allows to define
a specific operation for access checks.

```graphql
type Query {
  post(path: String!): Page @route(path: "$path") @loadEntity
}
```

Otherwise, it requires to define a static `type` argument and either an `id`
(dynamic) or `uuid` (dynamic) argument.

```graphql
type Query {
  id(id: String!): Post @loadEntity(type: "node", id: "$id")
  uuid(uuid: String!): Post @loadEntity(type: "node", uuid: "$uuid")
}
```

### `@resolveEntity[...]`

Retrieve various simple properties of an entity. The following directives are
supported:

- `@resolveEntityId`
- `@resolveEntityUuid`
- `@resolveEntityType`
- `@resolveEntityBundle`
- `@resolveEntityLabel`
- `@resolveEntityPath`
- `@resolveEntityLanguage`

```graphql
type Query {
  post(id: String!): Post @loadEntity(type: "node", id: "$id")
}

type Post {
  title: String! @resolveEntityLabel
}
```

### `@resolveEntityTranslation`

Retrieve as specific translation of an entity, defined by the `lang` (dynamic)
argument.

```graphql
type Query {
  post(id: String!, lang: String!): Post
    @loadEntity(type: "node", id: "$id")
    @resolveEntityTranslation(lang: "$lang")
}
```

### `@resolveEntityTranslations`

Retrieve all translations of an entity.

```graphql
type Query {
  post(id: String!): Post @loadEntity(type: "node", id: "$id")
}

type Post {
  translations: [Post!]! @resolveEntityTranslations
}
```

### `@resolveProperty`

Retrieve a property of an entity by its `path` argument.

```graphql
type Post {
  body: String @resolveProperty(path: "body.value")
}
```

### `@lang`

Switch the current execution language for the remaining subtree below the
current field. Accepts either a `code` argument (dynamic) or, if omitted, uses
the parent value. If the latter is a string, it will be used as-is, if its an
instance of `TranslatableInteface`, the language is derived from there.

```graphql
type Query {
  post(id: String!): Post @loadEntity(type: "node", id: "$id") @lang
}
```

### `@resolveMenuItems`

Retrieve all items of a menu entity. Accepts an optional `max_level` argument
that caps the maximum number of menu levels. The tree is flattened to a list, to
avoid the necessity of nested fragments. The `@resolveMenuItemId` and
`@resolveMenuItemParentId` directives should be used to reconstruct the tree in
the consumer. The list of menu items is also filtered by language, respecting
the current execution context language, as it can be controlled by `@lang`.

```graphql
type Query {
  menu: Limited! @loadEntity(type: "menu", id: "main", operation: "view label")
}

type Menu {
  items: [MenuItem!]! @lang(code: "fr") @resolveMenuItems(max_level: 2)
}
```

### `@resolveMenuItem[...]`

Various menu item properties.

- `@resolveMenuItemId`
- `@resolveMenuItemParentId`
- `@resolveMenuItemLabel`
- `@resolveMenuItemUrl`

### `@resolveEntityReference` & `@resolveEntityReferenceRevisions`

Resolve referenced entities attached to a given `field`. Will attempt to
retrieve translations matching the current host entity.

```graphql
type Query {
  post(id: String!): Post @loadEntity(type: "node", id: "$id") @lang
}

type Post {
  title: String! @resolveEntityLabel
  related: [Post!]! @resolveEntityReference(field: "field_related")
}
```

### `@drupalView`

Executes a Drupal view.

```graphql
type Query {
  contentHub(locale: String!, args: String): ContentHubView!
    @lang(code: "$locale")
    @drupalView(id: "content_hub:default", args: "$args")
}

type ContentHubView {
  total: Int!
  rows: [Post!]!
  filters: ContentHubViewFilters!
}

type ContentHubViewFilters {
  tag: [ViewFilter!]!
  category: [ViewFilter!]!
}

type ViewFilter {
  value: String!
  label: String!
}
```

#### `id` argument

View ID and display separated by colon. Example: `content_hub:default`.

#### `args` argument

Filters, page number, etc. in query string format. Example:
`page=1&pageSize=9&contextualFilters=40/12&tag[]=1&type=foo`

Reserved keys:

- `page`: The page number. Starts from 1. Defaults to 1.
- `pageSize`: The number of items per page. Defaults to 10.
- `contextualFilters`: Contextual filter values, for example, `40/12/10`.

The rest of keys are taken as filters.

Array values are allowed in the format of NPM `query-string` package with
`arrayFormat` set to `bracket`, e.g. `tag[]=1&tag[]=2`. Ensure that the view
filter Selection type is set to Dropdown not Autocomplete for entity references.

#### Returning result

The structure of the result is the following:

```ts
type Result = {
  total: number;
  items: [DrupalEntity];
  filters: {
    [filterKey: string]: Array<{
      value: string;
      label: string;
    }>;
  };
};
```

#### Translations

Use the `@lang` directive to set the language for the view. If the resulting
entities have the chosen language, they will be returned in that language.

If the results have to be filtered by the language, use
`Content: Translation language (= Interface text language selected for page)`
filter in the view.

## Extending

To add custom directives, create a module and add new Plugins in the
`src/Plugin/GraphQL/Directive` directory. The plugins "id" will be the handle to
invoke it in the schema, without the `@` prefix.

```php
<?php
namespace Drupal\my_directives\Plugin\GraphQL\Directive;

use Drupal\graphql_directives\DirectiveInterface;

/**
* @Directive(
*   id="echo",
*   description="Return the same string that you put in.",
*   arguments = {
*     "input" = "String!",
*   }
* )
 */
class EchoDirective extends PluginBase implements DirectiveInterface {
  /**
   * {@inheritdoc}
   */
  public function buildResolver(
    ResolverBuilder $builder,
    array $arguments
  ) : ResolverInterface {
    return $builder->fromValue($arguments['input']);
  }
}
```

## Autoloading

The
[`@amazeelabs/codegen-autoloader`](https://github.com/AmazeeLabs/silverback-mono/blob/development/packages/npm/@amazeelabs/codegen-autoloader/README.md)
provides a convenient option to add new directives using the `drupal` mode. The
resulting JSON file is compatible to this modules `Autoload registry`
configuration option.

## Schema Extensions

The module provides a `DirectableSchemaExtensionPluginBase` class that can be
used to create schema extensions that react to directives in the parent schema
definition. A schema extension plugin for the Drupal GraphQL module provides two
schema definitions: one for the "base" schema and one for the actual extensions.
In case of directable schema extension, the base schema definition should
contain the directives while the extension schema defines the derived types and
fields.

For a very simple example, please refer to the `graphql_directives_test` module.
