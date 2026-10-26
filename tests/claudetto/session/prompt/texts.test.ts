// Design D7: `agents/main.md` replaces the whole system prompt, so it carries the security policy of the section that it turns off.
// `fixtures/text-defaults-2.1.309.json` holds the default text of each surface, which `bun dev/text-defaults.ts` captures.

import { expect, test } from "bun:test";
import path from "node:path";
import { PLUGINS } from "../../../support/repo.ts";
import DEFAULTS from "./fixtures/text-defaults-2.1.309.json";

const CORE = path.join(PLUGINS, "claudetto");

const captured = DEFAULTS as Record<
  string,
  { text: string; page: string; offset: number | null }
>;

/** The text of a Markdown file without its front matter. */
const body = async (file: string): Promise<string> =>
  (await Bun.file(path.join(CORE, file)).text())
    .replace(/^---\n[\s\S]*?\n---\n/, "")
    .trim();

// `main` turns off `intro`, so it must carry the security policy of that section itself (the user, 2026-10-25).
test("Security Policy: `main` holds the security-testing policy of the captured `intro`", async () => {
  const policy =
    /Assist with authorized security testing[^\n]*use cases\./.exec(
      captured["main"]?.text ?? "",
    )?.[0];
  expect(policy).toBeDefined();
  expect(await body("agents/main.md")).toContain(policy as string);
});
