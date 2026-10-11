// Each link in `wiki/` resolves (task 16.4).
// A link without a scheme is a wiki page (`Page` or `Page#anchor`, the form of the published wiki)
// or a relative path to a file of the repository.
// An `http` link is out of scope, because the test needs no network.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { REPO } from "./repo.ts";

const WIKI = path.join(REPO, "wiki");
// The GitHub Wiki finds a page by its file name, also in a subfolder such as `archive/`.
const pages = fs
  .readdirSync(WIKI, { recursive: true, encoding: "utf8" })
  .filter((f) => f.endsWith(".md"));
const byName = new Map<string, string[]>();
for (const page of pages) {
  const name = path.basename(page, ".md");
  byName.set(name, [...(byName.get(name) ?? []), page]);
}

/** The GitHub anchors of the headings of `text`, outside code blocks. */
function anchors(text: string): Set<string> {
  const out = new Set<string>();
  let fence = false;
  for (const line of text.split("\n")) {
    if (/^\s*```/.test(line)) fence = !fence;
    const m = !fence && /^#{1,6}\s+(.*?)\s*#*$/.exec(line);
    if (m)
      out.add(
        (m[1] as string)
          .toLowerCase()
          .replace(/[`*_]/g, "")
          .replace(/[^\p{L}\p{N} -]/gu, "")
          .replace(/ /g, "-"),
      );
  }
  return out;
}

/** The link targets of `text`, outside code blocks and spans. */
function targets(text: string): string[] {
  const plain = text
    .replace(/^\s*```[\s\S]*?^\s*```/gm, "")
    .replace(/`[^`\n]*`/g, "");
  return [...plain.matchAll(/\]\(([^)\s]+)\)/g)].map((m) => m[1] as string);
}

/** The broken links of the wiki, as "page: target". */
async function broken(): Promise<string[]> {
  const bad = [];
  for (const page of pages) {
    for (const t of targets(await Bun.file(path.join(WIKI, page)).text())) {
      if (/^[a-z][a-z0-9+.-]*:/i.test(t)) continue;
      const [file, anchor] = t.split("#") as [string, string | undefined];
      const own = file === "";
      const named = byName.get(file)?.[0];
      // A page link with a folder does not resolve on the GitHub Wiki, which addresses a page by name.
      if (
        !named &&
        byName.has(path.basename(file, ".md")) &&
        !file.startsWith(".")
      ) {
        bad.push(`${page}: ${t}`);
        continue;
      }
      const target = own
        ? path.join(WIKI, page)
        : named
          ? path.join(WIKI, named)
          : path.resolve(WIKI, path.dirname(page), file);
      if (!fs.existsSync(target)) {
        bad.push(`${page}: ${t}`);
      } else if (anchor && target.endsWith(".md")) {
        if (!anchors(await Bun.file(target).text()).has(anchor))
          bad.push(`${page}: ${t}`);
      }
    }
  }
  return bad;
}

// A lint of the live wiki.
test("lint: each link in `wiki/` resolves", async () => {
  expect(await broken()).toStrictEqual([]);
});

test("lint: each page name in `wiki/` is unique across its folders", () => {
  expect(
    [...byName.values()].filter((files) => files.length > 1),
  ).toStrictEqual([]);
});

test("the anchor rule follows the GitHub slug", () => {
  expect([
    ...anchors("## The `sec-default` guard (3)\n```\n# no\n```"),
  ]).toStrictEqual(["the-sec-default-guard-3"]);
});
