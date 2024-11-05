import {
  ExecutableDefinitionNode,
  FieldNode,
  FragmentDefinitionNode,
  FragmentSpreadNode,
  InlineFragmentNode,
  Kind,
} from 'graphql';

export function scanFragments<
  TNode extends
    | ExecutableDefinitionNode
    | FieldNode
    | InlineFragmentNode
    | FragmentSpreadNode,
>(node: TNode, fragments: Map<string, FragmentDefinitionNode>): Array<string> {
  const result: Array<string> = [];
  if (node.kind === Kind.FRAGMENT_SPREAD) {
    const fragment = fragments.get(node.name.value);
    result.push(node.name.value);
    if (fragment) {
      fragment.selectionSet.selections.forEach((sel) => {
        scanFragments(sel, fragments).forEach((frag) => {
          result.push(frag);
        });
      });
    }
    return result;
  }
  node.selectionSet?.selections.forEach((sel) => {
    if (sel.kind === Kind.FRAGMENT_SPREAD) {
      result.push(sel.name.value);
      const fragment = fragments.get(sel.name.value);
      if (fragment) {
        fragment.selectionSet.selections.forEach((sel) => {
          scanFragments(sel, fragments).forEach((frag) => {
            result.push(frag);
          });
        });
      }
    } else if (sel.kind === Kind.INLINE_FRAGMENT) {
      sel.selectionSet.selections.forEach((sel) => {
        scanFragments(sel, fragments).forEach((frag) => {
          result.push(frag);
        });
      });
    } else if (sel.kind === Kind.FIELD && sel.selectionSet) {
      scanFragments(sel, fragments).forEach((frag) => {
        result.push(frag);
      });
    }
  });
  return result;
}
