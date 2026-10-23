// claudetto-docs: the marketplace entry and the manifest match `description.md`, the plugin has no hooks, and the `ctx7` rules are read-only and pinned.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { DOCS_SNIPPET } from "../../plugins/claudetto/snippets.ts";
import {
  CTX7_RUNNER,
  CTX7_VERSION,
  READ_SUBCOMMANDS,
} from "../../plugins/claudetto-docs/slices/docs/limits.ts";
import { CTX7_HELP_TIMEOUT_MS } from "../../tools/limits.ts";
import { PLUGINS, REPO } from "../support/repo.ts";

const ROOT = path.join(PLUGINS, "claudetto-docs");
const manifest: { description: string } = await Bun.file(
  path.join(ROOT, ".claude-plugin/plugin.json"),
).json();
const marketplace: {
  plugins: { name: string; source: string; description: string }[];
} = await Bun.file(path.join(REPO, ".claude-plugin/marketplace.json")).json();
/** The text of `description.md`, with one sentence on each line. */
const description = await Bun.file(path.join(ROOT, "description.md")).text();

test("the manifest has the sentences of `description.md` on one line", () => {
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
  path.join(ROOT, "skills/find-docs/SKILL.md"),
).text();
const snippet = DOCS_SNIPPET;
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
});

test("the settings snippet allows the same commands as the skill", () => {
  const bash = snippet.permissions.allow.filter((r) => r.startsWith("Bash("));
  expect(bash).toStrictEqual(READ_SUBCOMMANDS.map(rule));
});

test("the `context7` server has a fixed `url`, and sends the sensitive key, empty by default, only in its header", async () => {
  const full = await Bun.file(
    path.join(ROOT, ".claude-plugin/plugin.json"),
  ).json();
  expect(full.mcpServers.context7).toStrictEqual({
    type: "http",
    url: "https://mcp.context7.com/mcp",
    // biome-ignore lint/suspicious/noTemplateCurlyInString: the placeholder of Claude Code for a plugin option
    headers: { "Context7-API-Key": "${user_config.CONTEXT7_API_KEY}" },
  });
  const key = full.userConfig.CONTEXT7_API_KEY;
  expect([key.sensitive, key.default]).toStrictEqual([true, ""]);
  expect(SKILL).toContain("mcp__plugin_claudetto-docs_context7__query-docs");
});

test(
  "the pinned `ctx7` has the `library` and `docs` commands that the skill runs",
  async () => {
    const proc = Bun.spawn(["bunx", "-y", `ctx7@${CTX7_VERSION}`, "--help"], {
      env: { ...process.env, CTX7_TELEMETRY_DISABLED: "1" },
      stdout: "pipe",
      stderr: "pipe",
    });
    const help = await new Response(proc.stdout).text();
    expect(await proc.exited).toBe(0);
    expect(help).toMatch(/^ {2}library \[options\] <name> \[query\]/m);
    expect(help).toMatch(/^ {2}docs \[options\] <libraryId> <query>/m);
  },
  CTX7_HELP_TIMEOUT_MS,
);
