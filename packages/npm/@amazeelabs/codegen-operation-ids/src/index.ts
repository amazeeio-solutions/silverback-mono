import { oldVisit, PluginFunction } from '@graphql-codegen/plugin-helpers';
import { ClientSideBaseVisitor } from '@graphql-codegen/visitor-plugin-common';
import { pascalCase } from 'change-case-all';
import crypto from 'crypto';
import {
  concatAST,
  FragmentDefinitionNode,
  OperationDefinitionNode,
  print,
  visit,
} from 'graphql';

import { inlineFragments } from './inline';
import { scanFragments } from './scan';

class OperationIdVisitor extends ClientSideBaseVisitor {
  _extractFragments() {
    return [];
  }
  OperationDefinition(node: OperationDefinitionNode) {
    this._collectedOperations.push(node);
    const operationType = pascalCase(node.operation);
    const operationTypeSuffix = this.getOperationSuffix(node, operationType);
    const operationResultType = this.convertName(node, {
      suffix: operationTypeSuffix + this._parsedConfig.operationResultSuffix,
    });
    const operationVariablesTypes = this.convertName(node, {
      suffix: operationTypeSuffix + 'Variables',
    });
    const hasRequiredVariables = this.checkVariablesRequirements(node);

    return `export const ${operationResultType} = "${queryId(
      node,
      print(node),
    )}" as OperationId<${operationResultType},${operationVariablesTypes}${
      hasRequiredVariables ? '' : ' | undefined'
    }>;`;
  }
}

function queryId(node: OperationDefinitionNode, content: string) {
  return `${node.name?.value ?? 'anonymous'}${pascalCase(
    node.operation,
  )}:${crypto.createHash('sha256').update(content).digest('hex')}`;
}

export const plugin: PluginFunction<any, string> = async (
  schema,
  documents,
  config,
  info,
) => {
  const outputMap = info?.outputFile?.match(/\.json$/);

  function isNotEmpty<T extends any>(obj: T | undefined): obj is T {
    return obj !== undefined;
  }

  const allAst = concatAST(
    documents.map(({ document }) => document).filter(isNotEmpty),
  );

  const fragmentMap = new Map<string, FragmentDefinitionNode>();
  visit(allAst, {
    FragmentDefinition(node) {
      fragmentMap.set(node.name.value, node);
    },
  });

  const operationMap = new Map<string, string>();
  const idMap = new Map<string, string>();
  visit(allAst, {
    OperationDefinition(node) {
      const id = queryId(node, print(inlineFragments(node, fragmentMap)));
      const query = [
        print(
          config.fragments === 'inline'
            ? inlineFragments(node, fragmentMap)
            : node,
        ),
      ];
      if (config.fragments === 'attach') {
        scanFragments(node, fragmentMap).forEach((name) => {
          const fragment = fragmentMap.get(name);
          if (fragment) {
            query.push(print(fragment));
          }
        });
      }
      const queryString = query.join('\n');
      operationMap.set(id, queryString);
      if (node.name) {
        idMap.set(node.name.value, id);
      }
    },
  });

  if (outputMap) {
    return JSON.stringify(Object.fromEntries(operationMap));
  }

  const document = [
    `import type { OperationId } from '@amazeelabs/codegen-operation-ids';`,
  ];

  const visitor = new OperationIdVisitor(schema, [], config, {}, documents);
  const visitorResult = oldVisit(allAst, {
    // TODO: Remove @ts-ignore once the issue is fixed.
    // @ts-ignore Looks like graphql v16 is not fully supported yet: https://github.com/dotansimha/graphql-code-generator/issues/7519
    leave: visitor,
  });
  return [
    ...document,
    ...visitorResult.definitions.filter((def: any) => typeof def === 'string'),
  ].join('\n');
};
