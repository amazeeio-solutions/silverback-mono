import * as diff from 'diff';
import fs from 'fs-extra';
import yaml from 'js-yaml';
import prompts, { PromptObject } from 'prompts';

export async function patchFile(file: string, patch: string) {
  const original = (await fs.readFile(file)).toString();
  const patched = diff.applyPatch(original, patch);
  const sep = [...new Array(20)].map(() => '~').join('');
  if (patched) {
    await fs.writeFile(file, patched);
  } else {
    throw new Error(
      `\n\nFailed to apply patch to ${file}:\n${sep} file  ${sep}\n${original}\n${sep} patch ${sep}\n${patch}\n${sep}${sep}~~~~~~\n\n`,
    );
  }
}

export async function prompt(variable: string, prompt: PromptObject) {
  if (typeof process.env[variable] === 'string') {
    if (prompt.validate) {
      const error = await prompt.validate(
        undefined,
        [process.env[variable]],
        prompt,
      );
      if (typeof error === 'string') {
        throw new Error(error);
      }
    }
    return process.env[variable];
  }
  process.env[variable] = (
    await prompts<string>({ ...prompt, name: 'value' })
  ).value;
}

export function file(
  filename: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  processor: (data: any) => any = (data) => data,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  const content = fs.existsSync(filename)
    ? fs.readFileSync(filename).toString()
    : null;
  if (filename.match(/\.json$/)) {
    const data = processor(content ? JSON.parse(content) : {});
    fs.writeFileSync(filename, JSON.stringify(data, null, 2));
    return data;
  }
  if (filename.match(/\.ya?ml$/)) {
    const data = processor(content ? yaml.load(content) : {});
    fs.writeFileSync(
      filename,
      yaml.dump(data, {
        indent: 2,
      }),
    );
    return data;
  }
  const data = processor(content ? content.split('\n') : []);
  fs.writeFileSync(filename, data.join('\n'));
  return data;
}
