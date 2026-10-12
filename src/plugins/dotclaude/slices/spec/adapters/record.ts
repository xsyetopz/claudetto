// `dotclaude-spec record <text>`: writes the record of a hotfix.

import path from "node:path";
import { HOTFIX_DIR } from "../../../../../kernel/paths.ts";
import { HOTFIX_SLUG_MAX } from "../limits.ts";
import { HOTFIX } from "../templates/files.ts";
import { dateOf, type Run } from "./run.ts";

/** The file name part of `text`: lowercase words joined with `-`, cut at `HOTFIX_SLUG_MAX`. */
export const slugOf = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .slice(0, HOTFIX_SLUG_MAX)
    .replace(/-+$/, "");

export const recordCommand = async (
  run: Run,
  args: string[],
): Promise<number> => {
  const text = args.join(" ").trim();
  if (text === "") {
    run.io.error("Usage: dotclaude-spec record <text>");
    return 2;
  }
  const date = dateOf(run.clock);
  const base = path.posix.join(
    HOTFIX_DIR,
    `${date}-${slugOf(text) || "hotfix"}`,
  );
  let file = `${base}.md`;
  for (let n = 2; run.store.exists(file); n++) file = `${base}-${n}.md`;
  await run.store.write(
    file,
    HOTFIX.replaceAll("<text>", () => text).replaceAll("<date>", date),
  );
  run.io.log(file);
  return 0;
};
