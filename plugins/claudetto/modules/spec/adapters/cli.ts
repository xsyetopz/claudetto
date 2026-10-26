// The CLI `minispec` of the `spec` slice, in the layout of OpenSpec 1.14.3. The launcher `bin/minispec` calls `main`.
// A schema in `openspec/schemas/<name>/` wins over the preset in `presets/<name>/`, and a template that it lacks comes from `presets/templates/`.
// Each command gives its JSON object and its text lines, and `main` prints one of them.

import path from "node:path";
import { CHANGES_DIR } from "../../project/index.ts";
import { archive, sync } from "./archive.ts";
import { changeStatus, instructions, newChange } from "./change.ts";
import { validate } from "./check.ts";
import { type Ctx, Fail, type Out, projectRoot } from "./ctx.ts";
import { list, show } from "./list.ts";
import { schemas, schemaValidate } from "./schemas.ts";

/** Each command: its usage line, its code, and the word that must follow it (`new change`, `schema validate`). */
const COMMANDS: Record<string, [string, (ctx: Ctx) => Promise<Out>, string?]> =
  {
    new: [
      "minispec new change <name> [--schema <preset>] [--description <text>] [--json]",
      newChange,
      "change",
    ],
    list: [
      "minispec list [--specs | --archived | --all] [--sort recent|name] [--json]",
      list,
    ],
    status: ["minispec status --change <name> [--json]", changeStatus],
    instructions: [
      "minispec instructions apply|<artifact> --change <name> [--json]",
      instructions,
    ],
    show: [
      "minispec show <change|spec> [--json] [--deltas-only] [--diff] [--requirements] [-r <n>]",
      show,
    ],
    validate: [
      "minispec validate <name> | --all | --changes | --specs [--strict] [--json]",
      validate,
    ],
    schemas: ["minispec schemas [--json]", schemas],
    schema: [
      "minispec schema validate [<name>] [--json]",
      schemaValidate,
      "validate",
    ],
    sync: ["minispec sync <name>", sync],
    archive: [
      "minispec archive <name> [--yes] [--skip-specs] [--no-validate] [--json]",
      archive,
    ],
  };

/** Runs `minispec` with `args` in the project of `cwd`, and gives the exit status. */
export const main = async (
  args: string[],
  cwd: string = process.cwd(),
  io: Ctx["io"] = console,
): Promise<number> => {
  const root = projectRoot(cwd);
  const ctx: Ctx = {
    root,
    changes: path.join(root, CHANGES_DIR),
    configFile: path.join(root, "openspec/config.yaml"),
    args,
    io,
  };
  try {
    const [usage, run, sub] = COMMANDS[args[0] ?? ""] ?? [];
    if (!run || (sub && args[1] !== sub))
      throw new Fail(
        `Usage:\n${
          usage
            ? `  ${usage}`
            : Object.values(COMMANDS)
                .map(([u]) => `  ${u}`)
                .join("\n")
        }`,
        2,
      );
    const [data, lines, code = 0] = await run(ctx);
    if (data !== undefined && args.includes("--json"))
      io.log(JSON.stringify(data, null, 2));
    else for (const line of lines) io.log(line);
    return code;
  } catch (e) {
    if (!(e instanceof Fail)) throw e;
    io.error(e.message);
    return e.status;
  }
};
