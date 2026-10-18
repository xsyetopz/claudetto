// The sample change of each preset passes `openspec validate --strict` and reaches `isComplete`.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { REPO, tmpDir } from "../../support/repo.ts";

const SKILL = path.join(REPO, "plugins/claudetto/skills/spec");
const BIN = path.join(
  REPO,
  "node_modules/@fission-ai/openspec/bin/openspec.js",
);
const SAMPLES = path.join(import.meta.dirname, "samples");

/** Run `openspec` in `cwd` with telemetry off, and return the exit code and the output. */
const openspec = async (cwd: string, args: string[]) => {
  const proc = Bun.spawn([process.execPath, BIN, ...args], {
    cwd,
    env: { ...process.env, OPENSPEC_TELEMETRY: "0", NO_COLOR: "1" },
    stdout: "pipe",
    stderr: "pipe",
  });
  const [out, err, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { code, out: out + err };
};

/** A project with the sample of `preset` and the shipped schema of `preset`. */
const project = async (preset: string): Promise<string> => {
  const root = tmpDir(`sample-${preset}`);
  const spec = path.join(root, "openspec");
  fs.cpSync(path.join(SAMPLES, preset, "openspec"), spec, { recursive: true });
  fs.cpSync(
    path.join(SKILL, "schemas", preset),
    path.join(spec, "schemas", preset),
    { recursive: true },
  );
  await Bun.write(path.join(spec, "config.yaml"), `schema: ${preset}\n`);
  return root;
};

test.each([
  ["task", "fix-greeting-typo"],
  ["story", "add-greeting-name"],
  ["epic", "build-greeter"],
])(
  "the sample of the preset `%s` validates and has each artifact done",
  async (preset, change) => {
    const root = await project(preset);
    const valid = await openspec(root, ["validate", "--all", "--strict"]);
    expect(valid.out).toContain(change);
    expect(valid.code).toBe(0);
    const status = await openspec(root, [
      "status",
      "--change",
      change,
      "--json",
    ]);
    expect(status.code).toBe(0);
    const json = JSON.parse(status.out);
    expect(json.isComplete).toBe(true);
    expect(json.schemaName).toBe(preset);
  },
  60_000,
);
