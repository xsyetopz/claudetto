// The finding of policy files (`domain/discover.ts`) over a fake tree.

import { expect, test } from "bun:test";
import {
  discover,
  type Entry,
  type Reader,
} from "../../../src/plugins/claudetto/slices/policy/domain/discover.ts";

/** A reader over `tree`: a path with a text is a file, and a folder is every first segment below it. */
const readerOf = (
  tree: Record<string, string>,
  broken: string[] = [],
): Reader => ({
  list: async (dir) => {
    const prefix = dir === "" ? "" : `${dir}/`;
    const seen = new Map<string, Entry["kind"]>();
    for (const path of Object.keys(tree)) {
      if (!path.startsWith(prefix)) continue;
      const rest = path.slice(prefix.length);
      const slash = rest.indexOf("/");
      seen.set(
        slash < 0 ? rest : rest.slice(0, slash),
        slash < 0 ? "file" : "dir",
      );
    }
    return [...seen].map(([name, kind]) => ({ name, kind }));
  },
  read: async (path) => {
    if (broken.includes(path)) throw new Error("denied");
    return tree[path];
  },
});

test("`discover` finds the policy files in the root, `.github`, and `docs`", async () => {
  const found = await discover(
    readerOf({
      "AGENTS.md": "a",
      "contributing.md": "b",
      "src/main.ts": "c",
      ".github/AI_POLICY.md": "d",
      "docs/CONTRIBUTING.md": "e",
    }),
  );
  expect(found.files.map((f) => f.path).sort()).toEqual([
    ".github/AI_POLICY.md",
    "AGENTS.md",
    "contributing.md",
    "docs/CONTRIBUTING.md",
  ]);
  expect(found.unread).toEqual([]);
});

test("`discover` takes each file of the template folders", async () => {
  const found = await discover(
    readerOf({
      ".github/ISSUE_TEMPLATE/bug.yml": "x",
      ".github/PULL_REQUEST_TEMPLATE/a.md": "y",
    }),
  );
  expect(found.files).toHaveLength(2);
});

test("`discover` lists a file that it cannot read as unread", async () => {
  const found = await discover(readerOf({ "AGENTS.md": "a" }, ["AGENTS.md"]));
  expect(found.files).toEqual([]);
  expect(found.unread).toHaveLength(1);
});

test("a tree with no policy file gives no file and nothing unread", async () => {
  const found = await discover(readerOf({ "src/a.ts": "x" }));
  expect(found).toEqual({ files: [], unread: [] });
});

test("`discover` finds the rule files of other AI tools and the contribution guides", async () => {
  const found = await discover(
    readerOf({
      ".cursorrules": "a",
      "GEMINI.md": "b",
      "CONVENTIONS.md": "c",
      "HACKING.rst": "d",
      "docs/HACKING.md": "e",
      ".cursor/rules/style.mdc": "f",
      "SECURITY.md": "g",
    }),
  );
  expect(found.files.map((f) => f.path).sort()).toEqual([
    ".cursor/rules/style.mdc",
    ".cursorrules",
    "CONVENTIONS.md",
    "GEMINI.md",
    "HACKING.rst",
    "docs/HACKING.md",
  ]);
});

test("`discover` finds the root names of the catalog of AI contribution policies", async () => {
  // Source: https://github.com/melissawm/open-source-ai-contribution-policies
  const names = [
    "AI.md", // a row of the catalog
    "AI_COVENANT.md", // LinkML
    "AI_USAGE_POLICY.md", // Processing
    "AIAgreement.md", // Forgejo governance
    "ContributionRules", // EmulatorKit
    "Contribution-Policy-Agreement.md", // Makko
    "qep-408-ai-tool-policy.md", // QGIS enhancement proposals
    "Acceptable-and-Ethical-AI-Use-Policy.md", // GSoC of the University of Alaska Anchorage
  ];
  const tree: Record<string, string> = { "MAIN.md": "x", "SECURITY.md": "y" };
  for (const n of names) tree[n] = "a";
  const found = await discover(readerOf(tree));
  expect(found.files.map((f) => f.path).sort()).toEqual([...names].sort());
});

test("`discover` finds the folders of the catalog of AI contribution policies", async () => {
  // Sources: melissawm/open-source-ai-contribution-policies, rows for Xarray, Sphinx, Gedit, Astropy, STAC and Mesa
  const found = await discover(
    readerOf({
      "doc/contribute/ai-policy.md": "a",
      "doc/internals/ai-policy.rst": "b",
      "docs/guidelines/no-llm-tools.md": "c",
      "policies/ai-policy.md": "d",
      "docs/ai-contribution-policy.md": "e",
      "docs/submittingpatches.rst": "f",
      "docs/guidelines/style.md": "g",
    }),
  );
  expect(found.files.map((f) => f.path).sort()).toEqual([
    "doc/contribute/ai-policy.md",
    "doc/internals/ai-policy.rst",
    "docs/ai-contribution-policy.md",
    "docs/guidelines/no-llm-tools.md",
    "docs/submittingpatches.rst",
    "policies/ai-policy.md",
  ]);
});

test("`discover` reads the template folders of GitLab and `CONTRIBUTING.d`", async () => {
  // Sources: GIMP (`.gitlab/merge_request_templates/default.md`), Linux man-pages (`CONTRIBUTING.d/ai`)
  const found = await discover(
    readerOf({
      ".gitlab/merge_request_templates/default.md": "a",
      "CONTRIBUTING.d/ai": "b",
    }),
  );
  expect(found.files.map((f) => f.path).sort()).toEqual([
    ".gitlab/merge_request_templates/default.md",
    "CONTRIBUTING.d/ai",
  ]);
});
