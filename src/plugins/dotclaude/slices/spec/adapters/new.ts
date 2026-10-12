// `dotclaude-spec new <id> [--size trivial|medium|large]`: writes the files of the size.

import path from "node:path";
import { SPEC_ROOT } from "../../../../../kernel/paths.ts";
import type { ChangeState } from "../../../../../kernel/spec-store.ts";
import { SPEC_SCHEMA } from "../../../../../kernel/spec-store.ts";
import { CHANGE_ID, DEFAULT_SIZE, SIZES, type Size } from "../limits.ts";
import {
  CHANGE,
  CHANGE_TRIVIAL,
  DELTA,
  DESIGN,
  PACKAGE,
  PACKAGES,
} from "../templates/files.ts";
import type { Run } from "./run.ts";

const isSize = (value: string): value is Size =>
  (SIZES as readonly string[]).includes(value);

/** The files of a change of `size`, as pairs of a path under the change and a text. */
const filesOf = (size: Size): [string, string][] => {
  if (size === "trivial") return [["change.md", CHANGE_TRIVIAL]];
  const medium: [string, string][] = [
    ["change.md", CHANGE],
    ["specs/capability.md", DELTA],
  ];
  if (size === "medium") return medium;
  return [
    ...medium,
    ["design.md", DESIGN],
    ["packages.md", PACKAGES],
    ["packages/01-first.md", PACKAGE],
  ];
};

/** The value after `--size`, or the default size. It is null when the value is missing. */
const sizeOf = (args: string[]): string | null => {
  const i = args.indexOf("--size");
  if (i < 0) return DEFAULT_SIZE;
  return args[i + 1] ?? null;
};

export const newCommand = async (run: Run, args: string[]): Promise<number> => {
  const [id, ...rest] = args;
  const size = sizeOf(rest);
  if (!id || id.startsWith("--") || size === null) {
    run.io.error(
      "Usage: dotclaude-spec new <id> [--size trivial|medium|large]",
    );
    return 2;
  }
  if (!CHANGE_ID.test(id)) {
    run.io.error(
      `The id \`${id}\` is not valid. Use letters, digits, \`.\`, \`_\`, and \`-\`.`,
    );
    return 2;
  }
  if (!isSize(size)) {
    run.io.error(`The size \`${size}\` is not one of ${SIZES.join(", ")}.`);
    return 2;
  }
  const dir = path.posix.join(SPEC_ROOT, id);
  if (run.store.exists(dir)) {
    run.io.error(`The change \`${id}\` exists already.`);
    return 1;
  }
  for (const [file, text] of filesOf(size)) {
    await run.store.write(
      path.posix.join(dir, file),
      text.replaceAll("<id>", id),
    );
    run.io.log(path.posix.join(dir, file));
  }
  if (size === "large") {
    const state: ChangeState = {
      schema: SPEC_SCHEMA,
      lanes: { P01: "planned" },
      events: [],
      handoff: null,
    };
    await run.store.writeState(id, state);
    run.io.log(path.posix.join(dir, "state.json"));
  }
  return 0;
};
