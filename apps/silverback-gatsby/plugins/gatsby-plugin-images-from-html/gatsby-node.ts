import { CreateNodeArgs, CreateSchemaCustomizationArgs } from 'gatsby';

interface PluginOptions {
  configs: {
    nodeType: string;
    propertyPath: string;
    baseUrl: string;
  }[];
}

interface Urls {
  urlOriginal: string;
  urlAbsolute: string;
}

export const createSchemaCustomization = async (
  args: CreateSchemaCustomizationArgs,
  options: PluginOptions,
) => {
  const types = `"${options.configs.map((it) => it.nodeType).join('", "')}"`;
  args.actions.createTypes(`
    type ImagesFromHtml implements Node @childOf(types: [${types}], many: true) {
      urlOriginal: String!
      urlAbsolute: String!
    }
  `);
};

export const onCreateNode = async (
  args: CreateNodeArgs,
  options: PluginOptions,
) => {
  const config = options.configs.find(
    (it) => it.nodeType === args.node.internal.type,
  );
  if (config) {
    const html = getHtml(args.node, config.propertyPath.split('.'));
    if (html) {
      for (const url of parseUrls(html, config.baseUrl)) {
        const id = args.createNodeId(url.urlAbsolute);
        args.actions.createNode({
          id,
          ...url,
          internal: {
            type: 'ImagesFromHtml',
            contentDigest: args.createContentDigest(id),
          },
        });
        args.actions.createParentChildLink({
          parent: args.node,
          child: args.getNode(id)!,
        });
      }
    }
  }
};

const parseUrls = (html: string, baseUrl: string): Urls[] => {
  const matches = html.matchAll(/(src="([^"]+))|(src='([^']+))/gim);
  const result: Urls[] = [];
  for (const match of matches) {
    const urlOriginal = match[2] || match[4];
    // TODO: replace with real url parsing. Current version is too weak.
    const urlAbsolute = urlOriginal.startsWith('/')
      ? baseUrl + urlOriginal
      : urlOriginal;
    if (!result.find((it) => it.urlAbsolute === urlAbsolute)) {
      result.push({ urlOriginal, urlAbsolute });
    }
  }
  return result;
};

const getHtml = (
  object: Record<string, unknown>,
  path: string[],
  str = '',
): string => {
  const [propName, ...rest] = path;
  if (object && object[propName]) {
    const prop = object[propName];
    if (rest.length) {
      return Array.isArray(prop)
        ? prop.map((it) => getHtml(it, rest, str)).join()
        : getHtml(prop as Record<string, unknown>, rest, str);
    } else {
      return Array.isArray(prop) ? prop.join() : (prop as string);
    }
  }
  return str;
};
