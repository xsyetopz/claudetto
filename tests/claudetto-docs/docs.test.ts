// claudetto-docs: the marketplace entry and the manifest match `plugin.ts` and `description.md`, the plugin has no hooks, and the `ctx7` rules are read-only and pinned.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { planAddons } from "../../plugins/claudetto/slices/setup/domain/addons.ts";
import {
  CTX7_RUNNER,
  CTX7_VERSION,
  MAX_CALLS,
  READ_SUBCOMMANDS,
} from "../../src/plugins/claudetto-docs/slices/docs/limits.ts";
import { PLUGINS, REPO } from "../support/repo.ts";

const ROOT = path.join(PLUGINS, "claudetto-docs");
const manifest: { description: string } = await Bun.file(
  path.join(ROOT, ".claude-plugin/plugin.json"),
).json();
const marketplace: {
  plugins: { name: string; source: string; description: string }[];
} = await Bun.file(path.join(REPO, ".claude-plugin/marketplace.json")).json();
/** The text of `description.md`, with one sentence on each line. */
const description = await Bun.file(
  path.join(REPO, "src/plugins/claudetto-docs/description.md"),
).text();

test("the generated manifest has the sentences of `description.md` on one line", () => {
  expect(manifest.description).toBe(description.trim().split("\n").join(" "));
});

test("the marketplace lists the plugin with the description of the manifest", () => {
  const entry = marketplace.plugins.find(
    (p) => p.name === "claudetto-docs",
  ) as (typeof marketplace.plugins)[number];
  expect(entry.source).toBe("./plugins/claudetto-docs");
  expect(entry.description).toBe(manifest.description);
});

test("the plugin has no hooks", () => {
  expect(fs.existsSync(path.join(ROOT, "hooks"))).toBe(false);
});

// The pinned runner, the read-only rules, the project version, and no shipped MCP server (tasks 14.1 and 14.2).

const SKILL = await Bun.file(
  path.join(
    REPO,
    "src/plugins/claudetto-docs/slices/docs/skills/docs/SKILL.md",
  ),
).text();
const snippet: { permissions: { allow: string[] } } = await Bun.file(
  path.join(REPO, "src/fragments/docs-snippet.json"),
).json();
const rule = (sub: string) => `Bash(${CTX7_RUNNER} ${sub} *)`;

test("the pin is a fixed version, not a tag", () => {
  expect(CTX7_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  expect(CTX7_RUNNER).toBe(
    `CTX7_TELEMETRY_DISABLED=1 bunx -y ctx7@${CTX7_VERSION}`,
  );
});

test("the skill allows only the read subcommands, with the pinned runner", () => {
  const allowed = SKILL.match(/^allowed-tools: (.*)$/m)?.[1];
  expect(allowed).toBe(READ_SUBCOMMANDS.map(rule).join(" "));
  expect(SKILL).not.toContain("@latest");
});

test("the settings snippet allows the same commands as the skill", () => {
  const bash = snippet.permissions.allow.filter((r) => r.startsWith("Bash("));
  expect(bash).toStrictEqual(READ_SUBCOMMANDS.map(rule));
});

test("every ctx7 call in the skill text uses a read subcommand and the pinned runner", () => {
  const calls = SKILL.split("\n").filter((l) => l.includes("bunx -y ctx7@"));
  const forms = calls.filter((l) => !l.startsWith("allowed-tools"));
  expect(forms.length).toBe(READ_SUBCOMMANDS.length);
  for (const [i, l] of forms.entries())
    expect(l.startsWith(`${CTX7_RUNNER} ${READ_SUBCOMMANDS[i]} `)).toBe(true);
});

test("the call bound of the skill is the bound in limits.ts", () => {
  expect(SKILL).toContain(`at most ${MAX_CALLS} \`ctx7\` calls`);
  expect(SKILL).toContain(`${MAX_CALLS} calls do not answer`);
});

test("the skill asks for the docs of the project version", () => {
  expect(SKILL).toContain("version of the library that the project uses");
  expect(SKILL).toContain("/colinhacks/zod/v4.6.5");
});

test("the setup check reads bunx, the runner of the skill", () => {
  const names: string[] = [];
  const plan = planAddons(["claudetto-docs"], {
    projectDir: "/p",
    bun: "1.4.3",
    indexBuilt: false,
    version: (program) => {
      names.push(program);
      return "1.4.3";
    },
  });
  expect(names).toStrictEqual(["bunx"]);
  expect(plan.lines).toStrictEqual(["claudetto-docs: bunx 1.4.3"]);
});

test("the plugin ships no MCP server and no MCP option", async () => {
  const full: { userConfig?: Record<string, unknown> } = await Bun.file(
    path.join(ROOT, ".claude-plugin/plugin.json"),
  ).json();
  expect(fs.existsSync(path.join(ROOT, ".mcp.json"))).toBe(false);
  expect(full.userConfig).toBeUndefined();
});

test("the wiki page gives the MCP key as the `Authorization` header that the pinned `ctx7` writes", async () => {
  const page = await Bun.file(
    path.join(REPO, "wiki/add-ons/Library-Docs.md"),
  ).text();
  expect(page).toContain('--header "Authorization: Bearer $CONTEXT7_API_KEY"');
  expect(page).toContain(`\`ctx7\` ${CTX7_VERSION} does`);
});
