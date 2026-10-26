// The schemas of `openspec/schemas/`: each preset of the `spec` module with the templates that its `schema.yaml` names, and a header that names each source (spec `repo-tooling`, "Generated Schemas").
// A template comes from the folder of the preset, or else from the shared `templates/` folder, as `templateFile` of the `spec` module finds it.

import fs from "node:fs";
import path from "node:path";
import { type Page, stale, withHeader } from "./wiki.ts";

const PRESETS = "plugins/claudetto/modules/spec/presets";
const OUT = "openspec/schemas";

/** The page of the file `source` of `root` at `file`. */
const page = async (root: string, file: string, source: string) => ({
  file,
  source,
  text: withHeader(source, await Bun.file(path.join(root, source)).text()),
});

/** Each file of `openspec/schemas/` in `root`, from the presets. */
export const schemaPages = async (root: string): Promise<Page[]> => {
  const dir = path.join(root, PRESETS);
  const names = fs
    .readdirSync(dir)
    .filter((n) => fs.existsSync(path.join(dir, n, "schema.yaml")))
    .sort();
  const out: Page[] = [];
  for (const name of names) {
    const source = `${PRESETS}/${name}/schema.yaml`;
    out.push(await page(root, `${OUT}/${name}/schema.yaml`, source));
    const { artifacts = [] } = Bun.YAML.parse(
      await Bun.file(path.join(root, source)).text(),
    ) as { artifacts?: { template?: string }[] };
    for (const t of artifacts.flatMap((a) => a.template ?? [])) {
      const own = `${PRESETS}/${name}/templates/${t}`;
      const from = fs.existsSync(path.join(root, own))
        ? own
        : `${PRESETS}/templates/${t}`;
      out.push(await page(root, `${OUT}/${name}/templates/${t}`, from));
    }
  }
  return out;
};

/** The messages for each file of `openspec/schemas/` in `root` that differs from its preset, and for each file with no preset. */
export const schemaProblems = async (root: string): Promise<string[]> =>
  stale(root, await schemaPages(root), OUT, `${PRESETS}/`);
