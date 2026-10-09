// The sandbox hosts of `ctx7`: setup adds them only when `dotclaude-docs` is installed.

import { expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  installedAddons,
  withAddons,
} from "../../plugins/dotclaude/features/setup/addons.mjs";

const PLUGIN = path.join(import.meta.dirname, "../../plugins/dotclaude");
const SCRIPT = path.join(PLUGIN, "skills/setup/scripts/settings.mjs");
const NODE = Bun.which("node");
const PROFILE = JSON.parse(
  fs.readFileSync(path.join(PLUGIN, "features/setup/profile.json"), "utf8"),
);
const hosts = (p) => p.sandbox.network.allowedDomains;

test("without the add-on the profile has no Context7 host", () => {
  expect(hosts(withAddons(PROFILE, installedAddons({}, {})))).not.toContain(
    "context7.com",
  );
});

test("with the add-on the hosts of `ctx7` join the list once", () => {
  const names = installedAddons(
    { plugins: { "dotclaude-docs@dotclaude": [{}] } },
    {},
  );
  expect(names).toEqual(["dotclaude-docs"]);
  const list = hosts(withAddons(PROFILE, names));
  expect(list).toContain("context7.com");
  expect(list.filter((h) => h === "registry.npmjs.org")).toHaveLength(1);
  expect(list).toEqual(expect.arrayContaining(hosts(PROFILE)));
});

test("a disabled add-on adds nothing, and an enabled one counts", () => {
  const installed = { plugins: { "dotclaude-docs@dotclaude": [{}] } };
  expect(
    installedAddons(installed, { "dotclaude-docs@dotclaude": false }),
  ).toEqual([]);
  expect(installedAddons({}, { "dotclaude-docs@dotclaude": true })).toEqual([
    "dotclaude-docs",
  ]);
  expect(installedAddons({ plugins: { "other@dotclaude": [{}] } }, {})).toEqual(
    [],
  );
});

test("the setup script writes the host only when the add-on is installed", () => {
  for (const [installed, expected] of [
    [false, false],
    [true, true],
  ]) {
    const config = fs.mkdtempSync(path.join(os.tmpdir(), "dc-addons-"));
    if (installed) {
      fs.mkdirSync(path.join(config, "plugins"), { recursive: true });
      fs.writeFileSync(
        path.join(config, "plugins", "installed_plugins.json"),
        JSON.stringify({ plugins: { "dotclaude-docs@dotclaude": [{}] } }),
      );
    }
    const r = Bun.spawnSync([NODE, SCRIPT, "--scope", "user", "--apply"], {
      env: { CLAUDE_CONFIG_DIR: config, CLAUDE_PROJECT_DIR: config, PATH: "" },
    });
    expect(r.exitCode).toBe(0);
    const settings = JSON.parse(
      fs.readFileSync(path.join(config, "settings.json"), "utf8"),
    );
    expect(hosts(settings).includes("context7.com")).toBe(expected);
  }
});

test("with the add-on the profile allows the `docs` skill and the exact `ctx7` form of its `allowed-tools`", () => {
  const skill = fs.readFileSync(
    path.join(
      import.meta.dirname,
      "../../plugins/dotclaude-docs/skills/docs/SKILL.md",
    ),
    "utf8",
  );
  const rule = skill.match(/^allowed-tools: (.+)$/m)[1];
  const allow = withAddons(PROFILE, ["dotclaude-docs"]).permissions.allow;
  expect(allow).toContain(rule);
  expect(allow).toContain("Skill(dotclaude-docs:docs)");
  expect(withAddons(PROFILE, []).permissions.allow).not.toContain(rule);
});
