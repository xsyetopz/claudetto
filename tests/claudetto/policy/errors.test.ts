// Tests of the failure paths of the `policy` slice: a command that the reader cannot read, in a folder of an external repository or of the user.

import { expect, test } from "bun:test";
import {
  askOnError,
  type Call,
  type Deps,
} from "../../../src/plugins/claudetto/slices/policy/adapters/deny.ts";

const depsAt = (cwd: string, url: string): Deps => ({
  run: async (argv) =>
    argv[0] === "gh"
      ? { exitCode: 0, stdout: "me\n", stderr: "" }
      : argv.includes("rev-parse")
        ? { exitCode: 0, stdout: `${cwd}\n`, stderr: "" }
        : { exitCode: 0, stdout: `${url}\n`, stderr: "" },
  cwd: async () => cwd,
  abs: async () => cwd,
  push: async () => null,
  gate: async () => undefined,
  gh: async () => null,
  forbidden: async () => undefined,
  silent: async () => false,
});

/** A call whose `command` cannot be read, as a fault of the reader does. */
const broken = (): Call => ({
  tool: "Bash",
  get command(): string {
    throw new Error("the reader failed");
  },
});

test("a command that cannot be read asks in an external checkout", async () => {
  const d = depsAt("/work/ext", "https://github.com/them/ext.git");
  expect(await askOnError(d, broken())).toContain("could not check");
});

test("a command that cannot be read passes in a checkout of the user", async () => {
  const d = depsAt("/work/mine", "https://github.com/me/mine.git");
  expect(await askOnError(d, broken())).toBeUndefined();
});

test("a command that cannot be read passes when the folder is not read", async () => {
  const d = { ...depsAt("/work/x", "https://github.com/them/x.git") };
  d.cwd = async () => {
    throw new Error("the engine failed");
  };
  expect(await askOnError(d, broken())).toBeUndefined();
});
