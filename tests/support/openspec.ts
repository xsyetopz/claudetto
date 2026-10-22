// Runs the OpenSpec CLI of the dev dependencies on a copy of the spec samples.

import fs from "node:fs";
import path from "node:path";
import { main } from "../../plugins/claudetto/slices/spec/adapters/cli.ts";
import { REPO, tmpDir } from "./repo.ts";

/** An empty folder in the temp folder. */
export const tmpEmpty = tmpDir;

/** The presets of MiniSpec: the schemas `task`, `story`, and `epic`, and the template `config.yaml`. */
export const PRESETS = path.join(REPO, "plugins/claudetto/slices/spec/presets");
const BIN = path.join(
  REPO,
  "node_modules/@fission-ai/openspec/bin/openspec.js",
);
const SAMPLES = path.join(REPO, "tests/claudetto/spec/samples");

/** The sample change of each preset. */
export const SAMPLE_CHANGES = {
  task: "fix-greeting-typo",
  story: "add-greeting-name",
  epic: "build-greeter",
} as const;

/** Run `openspec` in `cwd` with telemetry off, and return the exit code and the output. */
export const openspec = async (cwd: string, args: string[]) => {
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

/** Run `minispec` in `cwd` in this process, and return the exit code and the printed text. */
export const minispec = async (cwd: string, args: string[]) => {
  const lines: string[] = [];
  const io = {
    log: (l: string) => lines.push(l),
    error: (l: string) => lines.push(l),
  };
  const code = await main(args, cwd, io);
  return { code, out: lines.join("\n") };
};

/** A project with the sample change of each preset in `presets`, the schema of each, and `config.yaml` with `schema: <first preset>`. */
export const sampleProject = async (
  presets: (keyof typeof SAMPLE_CHANGES)[],
): Promise<string> => {
  const root = tmpDir(`sample-${presets.join("-")}`);
  const spec = path.join(root, "openspec");
  for (const preset of presets) {
    fs.cpSync(path.join(SAMPLES, preset, "openspec"), spec, {
      recursive: true,
    });
    fs.cpSync(path.join(PRESETS, preset), path.join(spec, "schemas", preset), {
      recursive: true,
    });
  }
  await Bun.write(path.join(spec, "config.yaml"), `schema: ${presets[0]}\n`);
  return root;
};
