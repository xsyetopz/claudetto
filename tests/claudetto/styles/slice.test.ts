// Tests of the `styles` slice: the output style that the settings snippet selects, and the name in the front matter of that style.

import { expect, test } from "bun:test";
import path from "node:path";
import { slice } from "../../../src/plugins/claudetto/slices/styles/slice.ts";
import { REPO } from "../../support/repo.ts";

const STYLE = path.join(
  REPO,
  "src/plugins/claudetto/slices/styles/styles/Concise.md",
);

const frontMatterName = (text: string): string | undefined =>
  text
    .split("\n---")[0]
    ?.split("\n")
    .find((line) => line.startsWith("name:"))
    ?.slice("name:".length)
    .trim();

test("the settings snippet selects the style of the slice", () => {
  expect(slice.settings).toEqual({ outputStyle: "claudetto:Concise" });
});

test("the style file has the name that the settings snippet selects", async () => {
  const name = frontMatterName(await Bun.file(STYLE).text());
  expect(name).toBe("Concise");
  expect(slice.settings).toEqual({ outputStyle: `claudetto:${name}` });
});

test("the style keeps the coding instructions of Claude Code", async () => {
  const front = (await Bun.file(STYLE).text()).split("\n---")[0] ?? "";
  expect(front.split("\n")).toContain("keep-coding-instructions: true");
});

const replyStyle = async (): Promise<string> =>
  (await Bun.file(STYLE).text()).split("<reply_style>")[1] ?? "";

test("the style asks for a numbered `What I Need from You` list", async () => {
  const text = await replyStyle();
  expect(text).toContain("What I Need from You");
  expect(text).toContain("numbered");
});

test("the style asks for the list only on a turn that needs the user", async () => {
  const text = await replyStyle();
  expect(text).toMatch(/only (on|when)[^.]*needs the user/i);
  expect(text).toMatch(/needs nothing[^.]*no /);
  expect(text).not.toContain("Nothing needed from you right now");
});

test("the style gives an example from the work of claudetto with a `!` command", async () => {
  const text = await replyStyle();
  expect(text).toMatch(/`! [^`]+`/);
  expect(text).toContain("`! just sandbox`");
});
