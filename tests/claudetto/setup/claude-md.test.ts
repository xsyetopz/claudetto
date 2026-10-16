// The `claude-md` command of the `setup` CLI: it merges the managed block into a `CLAUDE.md` file.
// Each test runs `main` in a scratch project with a scratch `CLAUDE_CONFIG_DIR`.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { main } from "../../../plugins/claudetto/slices/setup/adapters/cli.ts";
import {
  BEGIN_MARKER,
  END_MARKER,
} from "../../../plugins/claudetto/slices/setup/domain/claude-md.ts";
import { tmpDir } from "../../support/repo.ts";

const setup = (): { repo: string; config: string; env: NodeJS.ProcessEnv } => {
  const base = tmpDir("claude-md");
  const repo = path.join(base, "repo");
  const config = path.join(base, "config");
  fs.mkdirSync(repo);
  return {
    repo,
    config,
    env: {
      ...process.env,
      CLAUDE_CONFIG_DIR: config,
      CLAUDE_PROJECT_DIR: repo,
    },
  };
};

const run = async (
  argv: string[],
  s: ReturnType<typeof setup>,
): Promise<{ code: number; text: string }> => {
  const out: string[] = [];
  const log = (l: string) => out.push(l);
  const code = await main(["claude-md", ...argv], s.env, s.repo, {
    log,
    error: log,
  });
  return { code, text: out.join("\n") };
};

const install = async (config: string, ids: string[], off: string[] = []) => {
  fs.mkdirSync(path.join(config, "plugins"), { recursive: true });
  await Bun.write(
    path.join(config, "plugins", "installed_plugins.json"),
    JSON.stringify({
      plugins: Object.fromEntries(ids.map((id) => [`${id}@claudetto`, []])),
    }),
  );
  await Bun.write(
    path.join(config, "settings.json"),
    JSON.stringify({
      enabledPlugins: Object.fromEntries(
        off.map((id) => [`${id}@claudetto`, false]),
      ),
    }),
  );
};

const read = (file: string) => Bun.file(file).text();

test("a missing file is created in each scope only with `--apply`", async () => {
  const s = setup();
  const files = {
    user: path.join(s.config, "CLAUDE.md"),
    project: path.join(s.repo, "CLAUDE.md"),
    local: path.join(s.repo, "CLAUDE.local.md"),
  };
  for (const [scope, file] of Object.entries(files)) {
    const dry = await run(["--scope", scope], s);
    expect(dry.code).toBe(0);
    expect(dry.text).toContain(file);
    expect(fs.existsSync(file)).toBe(false);
    expect((await run(["--scope", scope, "--apply"], s)).code).toBe(0);
    const text = await read(file);
    expect(text.startsWith(BEGIN_MARKER)).toBe(true);
    expect(text.endsWith(`${END_MARKER}\n`)).toBe(true);
  }
  expect(fs.readdirSync(s.repo).filter((f) => f.includes(".tmp"))).toEqual([]);
});

test("the default scope is `user`", async () => {
  const s = setup();
  expect((await run(["--apply"], s)).code).toBe(0);
  expect(fs.existsSync(path.join(s.config, "CLAUDE.md"))).toBe(true);
});

test("a second run changes nothing", async () => {
  const s = setup();
  await run(["--scope", "project", "--apply"], s);
  const file = path.join(s.repo, "CLAUDE.md");
  const first = await read(file);
  const again = await run(["--scope", "project", "--apply"], s);
  expect(again.code).toBe(0);
  expect(await read(file)).toBe(first);
});

test("an update replaces only the block, and the text of the user stays byte for byte", async () => {
  const s = setup();
  const file = path.join(s.repo, "CLAUDE.md");
  const before = "# Mine\n\nñ text\r\n";
  const after = "\n## Tail\nmore";
  await Bun.write(file, `${before}${BEGIN_MARKER}\nold\n${END_MARKER}${after}`);
  const res = await run(["--scope", "project", "--apply"], s);
  expect(res.code).toBe(0);
  const text = await read(file);
  expect(text.startsWith(before + BEGIN_MARKER)).toBe(true);
  expect(text.endsWith(END_MARKER + after)).toBe(true);
  expect(text).not.toContain("\nold\n");
});

test("a file without markers gets the block after the text of the user", async () => {
  const s = setup();
  const file = path.join(s.repo, "CLAUDE.md");
  await Bun.write(file, "# Mine\n");
  await run(["--scope", "project", "--apply"], s);
  const text = await read(file);
  expect(text.startsWith("# Mine\n")).toBe(true);
  expect(text).toContain(BEGIN_MARKER);
});

test("broken markers are refused and the file stays as it is", async () => {
  const s = setup();
  const file = path.join(s.repo, "CLAUDE.md");
  const layouts = [
    `${BEGIN_MARKER}\nx\n`,
    `x\n${END_MARKER}\n`,
    `${END_MARKER}\nx\n${BEGIN_MARKER}\n`,
    `${BEGIN_MARKER}\n${END_MARKER}\n${BEGIN_MARKER}\n${END_MARKER}\n`,
  ];
  const messages = new Set<string>();
  for (const layout of layouts) {
    await Bun.write(file, layout);
    const res = await run(["--scope", "project", "--apply"], s);
    expect(res.code).toBe(1);
    messages.add(res.text);
    expect(await read(file)).toBe(layout);
  }
  expect(messages.size).toBe(4);
});

test("a section appears only for an add-on that is installed and not turned off", async () => {
  const s = setup();
  await install(
    s.config,
    ["claudetto-codegraph", "claudetto-docs", "claudetto-browser"],
    ["claudetto-docs"],
  );
  await run(["--scope", "project", "--apply"], s);
  const text = await read(path.join(s.repo, "CLAUDE.md"));
  expect(text).toContain("`codegraph` skill");
  expect(text).toContain("`browse` skill");
  expect(text).not.toContain("`docs` skill");
  expect(text.indexOf("`codegraph` skill")).toBeLessThan(
    text.indexOf("`browse` skill"),
  );
  const bare = setup();
  await run(["--scope", "project", "--apply"], bare);
  const plain = await read(path.join(bare.repo, "CLAUDE.md"));
  expect(plain).not.toContain("`codegraph` skill");
  expect(plain).not.toContain("`browse` skill");
});

test("a new add-on updates the block of an earlier run", async () => {
  const s = setup();
  await run(["--scope", "project", "--apply"], s);
  await install(s.config, ["claudetto-codegraph"]);
  const res = await run(["--scope", "project", "--apply"], s);
  expect(res.code).toBe(0);
  expect(await read(path.join(s.repo, "CLAUDE.md"))).toContain(
    "`codegraph` skill",
  );
});

test("an unknown scope is an error and writes no file", async () => {
  const s = setup();
  expect((await run(["--scope", "nowhere", "--apply"], s)).code).toBe(2);
  expect(fs.readdirSync(s.repo)).toEqual([]);
});
