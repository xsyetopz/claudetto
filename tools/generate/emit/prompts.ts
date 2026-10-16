// Writes the prompt module of a slice from its `prompts/` folder (design, "Generated tree").
// A slice folder `prompts/` gives the module `prompts.ts` next to it, with one export for each `.md` or `.json` file, in name order.
// The export of `deny-reason.md` is `DENY_REASON`, and a `.json` file gives an object.
// A `{{NAME}}` in a text is a value, from the `limits.ts` of the slice or from `VALUES` of `emit/fill.ts`, filled at generate time.
// A `{{name}}` in a `.md` text is a parameter: the export is then a function of an object with one string for each name.
// The module holds no logic, so code imports each text from `../prompts.ts`.

import fs from "node:fs";
import path from "node:path";
import { fill, VALUES } from "./fill.ts";
import { format } from "./format.ts";

/** The name of the prompt folder of a slice, and of the module that it gives. */
export const PROMPTS = "prompts";
export const PROMPTS_MODULE = `${PROMPTS}.ts`;

/** A parameter of a `.md` text. */
const PARAM = /\{\{([a-z][A-Za-z0-9]*)\}\}/g;

/** One text of a prompt module: its file name, the path of its source, and its filled text. */
export type ModuleText = { name: string; source: string; text: string };

/**
 * `text` as a template literal that gives the same string, with each parameter as a field of `v`.
 * A `$` before a parameter, as in a price, needs no escape, because the parameter becomes a value.
 */
const literal = (text: string): string =>
  `\`${text
    .replace(/[\\`]/g, "\\$&")
    // A template literal turns CRLF into LF, so the text writes each CR as an escape.
    .replace(/\r/g, "\\r")
    .replace(/\$\{(?!\{[a-z][A-Za-z0-9]*\}\})/g, "\\${")
    .replace(PARAM, (_m, name: string) => `\${v.${name}}`)}\``;

/** The export of one text: a string, a function of its parameters, or a JSON object. */
const exportOf = (base: string, ext: string, body: string, source: string) => {
  const name = base.toUpperCase().replace(/-/g, "_");
  if (ext === "json") {
    try {
      JSON.parse(body);
    } catch (err) {
      throw new Error(`${source}: ${(err as Error).message}`);
    }
    return `export const ${name} = ${body};`;
  }
  const params = [...new Set([...body.matchAll(PARAM)].map((m) => m[1]))];
  if (!params.length) return `export const ${name} = ${literal(body)};`;
  const shape = params.map((p) => `${p}: string`).join("; ");
  return `export const ${name} = (v: { ${shape} }): string => ${literal(body)};`;
};

/**
 * The prompt module `file` of `texts`: one export for each `.md` or `.json` text, in name order.
 * With `pretty` off, Biome does not format it, for a module that is only imported and never written.
 */
export const moduleOf = async (
  file: string,
  texts: ModuleText[],
  pretty = true,
): Promise<string> => {
  const lines: string[] = [];
  const exported = new Map<string, string>();
  for (const { name, source, text } of texts.toSorted((a, b) =>
    a.name < b.name ? -1 : 1,
  )) {
    const [, base, ext = ""] = name.match(/^([a-z0-9-]+)\.(md|json)$/) ?? [];
    if (!base)
      throw new Error(
        `${source}: a \`${PROMPTS}/\` folder holds only \`.md\` and \`.json\` files with lowercase names`,
      );
    const export_ = base.toUpperCase().replace(/-/g, "_");
    const other = exported.get(export_);
    if (other)
      throw new Error(
        `${source}: the export ${export_} is also the export of ${other}, so rename one of the two files`,
      );
    exported.set(export_, source);
    lines.push(
      `/** From \`${source}\`. */`,
      exportOf(base, ext, text.replace(/(?:\r?\n)+$/, ""), source),
      "",
    );
  }
  const text = lines.join("\n");
  return pretty ? format(file, text) : text;
};

/** The values that a text of the slice folder `slice` can name: `VALUES` and the number and string exports of its `limits.ts`. */
export const sliceValues = async (
  slice: string,
): Promise<Record<string, string>> => {
  const file = path.join(slice, "limits.ts");
  const limits = fs.existsSync(file) ? await import(file) : {};
  const own = Object.entries(limits as Record<string, unknown>).flatMap(
    ([name, value]): [string, string][] =>
      typeof value === "number"
        ? [[name, value.toLocaleString("en-US")]]
        : typeof value === "string"
          ? [[name, value]]
          : [],
  );
  return { ...VALUES, ...Object.fromEntries(own) };
};

/** The prompt module of the slice folder `slice`, from its `prompts/` folder, with the include parts `made`, formatted when `pretty` is on. */
export const promptModule = async (
  root: string,
  slice: string,
  made: Record<string, string> = {},
  pretty = true,
): Promise<string> => {
  const dir = path.join(slice, PROMPTS);
  const fragments = path.join(root, "src", "fragments");
  const values = await sliceValues(slice);
  const texts: ModuleText[] = [];
  for (const name of fs.readdirSync(dir)) {
    const source = path
      .relative(root, path.join(dir, name))
      .split(path.sep)
      .join(path.posix.sep);
    const raw = await Bun.file(path.join(dir, name)).text();
    texts.push({
      name,
      source,
      text: await fill(raw, fragments, source, made, values),
    });
  }
  return moduleOf(
    path.join(path.relative(root, slice), PROMPTS_MODULE),
    texts,
    pretty,
  );
};
