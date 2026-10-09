// Each link in `wiki/` resolves (task 16.4).
// A link without a scheme is a wiki page (`Page` or `Page#anchor`, the form of the published wiki)
// or a relative path to a file of the repository.
// An `http` link is out of scope, because the test needs no network.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

const WIKI = path.join(import.meta.dirname, "../../wiki");
const pages = fs.readdirSync(WIKI).filter((f) => f.endsWith(".md"));

/** The GitHub anchors of the headings of `text`, outside code blocks. */
function anchors(text) {
  const out = new Set();
  let fence = false;
  for (const line of text.split("\n")) {
    if (/^\s*```/.test(line)) fence = !fence;
    const m = !fence && /^#{1,6}\s+(.*?)\s*#*$/.exec(line);
    if (m)
      out.add(
        m[1]
          .toLowerCase()
          .replace(/[`*_]/g, "")
          .replace(/[^\p{L}\p{N} -]/gu, "")
          .replace(/ /g, "-"),
      );
  }
  return out;
}

/** The link targets of `text`, outside code blocks and spans. */
function targets(text) {
  const plain = text
    .replace(/^\s*```[\s\S]*?^\s*```/gm, "")
    .replace(/`[^`\n]*`/g, "");
  return [...plain.matchAll(/\]\(([^)\s]+)\)/g)].map((m) => m[1]);
}

/** The broken links of the wiki, as "page: target". */
function broken() {
  const bad = [];
  for (const page of pages) {
    for (const t of targets(fs.readFileSync(path.join(WIKI, page), "utf8"))) {
      if (/^[a-z][a-z0-9+.-]*:/i.test(t)) continue;
      const [file, anchor] = t.split("#");
      const own = file === "";
      const md = path.join(WIKI, file.endsWith(".md") ? file : `${file}.md`);
      const target = own
        ? path.join(WIKI, page)
        : fs.existsSync(md)
          ? md
          : path.resolve(WIKI, file);
      if (!fs.existsSync(target)) {
        bad.push(`${page}: ${t}`);
      } else if (anchor && target.endsWith(".md")) {
        if (!anchors(fs.readFileSync(target, "utf8")).has(anchor))
          bad.push(`${page}: ${t}`);
      }
    }
  }
  return bad;
}

test("each link in `wiki/` resolves", () => {
  expect(broken()).toEqual([]);
});

test("the anchor rule follows the GitHub slug", () => {
  expect([
    ...anchors("## The `sec-default` guard (3)\n```\n# no\n```"),
  ]).toEqual(["the-sec-default-guard-3"]);
});
