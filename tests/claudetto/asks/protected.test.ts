// The asks for a call that changes a protected file or discards work (spec `safety-asks`, tasks 6.2).
// The checks give strings and stubs to the asks and run no command.

import { expect, test } from "bun:test";
import { askReason } from "../../../plugins/claudetto/slices/asks/domain/check.ts";
import {
  FILE_MAX_BYTES,
  SCAN_MAX_CHARS,
} from "../../../plugins/claudetto/slices/asks/limits.ts";
import { main, mainDeny } from "../guard/ports.ts";
import { asks, bash, edit, editAsks, write } from "./calls.ts";

const TEST_FILE = "/w/src/big.test.ts";
const NONE = { read: async () => null, root: "/w" };

test("an edit of a test file over the size bound that adds a skip asks", async () => {
  const io = { read: async () => null, large: async () => true };
  expect(await asks(edit(TEST_FILE, "a", 'it.skip("a", f);'), {}, io)).toBe(
    true,
  );
});

test("a write over a test file over the size bound asks", async () => {
  const io = { read: async () => null, large: async () => true };
  expect(await asks(write(TEST_FILE, "export {};\n"), {}, io)).toBe(true);
});

test("an edit of a test file just under the size bound gets read and compared", async () => {
  const text = `${"//".repeat(10)}\nexpect(a).toBe(1);\n`;
  expect(text.length < FILE_MAX_BYTES).toBe(true);
  expect(await editAsks(TEST_FILE, text, "expect(a).toBe(1);", "")).toBe(true);
  expect(await editAsks(TEST_FILE, text, "//", "// ")).toBe(false);
});

test("a write of a new test file gets no ask", async () => {
  expect(await asks(write(TEST_FILE, "export {};\n"))).toBe(false);
});

test("a text over the scan bound asks on a change of a test file", async () => {
  const text = `${"x".repeat(SCAN_MAX_CHARS)}\nexpect(a).toBe(1);\n`;
  expect(await editAsks(TEST_FILE, text, "expect(a).toBe(1);", "")).toBe(true);
});

test("the bounds file of the asks gets an ask on a changed bound", async () => {
  const file = "/w/src/plugins/claudetto/slices/asks/weak-limits.ts";
  const text = "export const STATEMENT_MAX_CHARS = 4_000;\n";
  expect(await editAsks(file, text, "4_000", "40_000")).toBe(true);
});

test("a limits file with a prefix in its name gets an ask on a changed bound", async () => {
  const text = "export const A_MAX = 10;\n";
  for (const name of ["weak-limits.ts", "my_budget.ts", "ci.limits.json"])
    expect(await editAsks(`/w/${name}`, text, "10", "11"), name).toBe(true);
});

test("a file with `limits` inside a word gets no ask", async () => {
  const text = "export const A_MAX = 10;\n";
  expect(await editAsks("/w/climits.ts", text, "10", "11")).toBe(false);
});

test("`git checkout -- bun.lock` gets an ask and no deny", async () => {
  const command = "git checkout -- bun.lock";
  const reason = await askReason(bash(command), NONE);
  expect(reason).toContain("`git checkout`");
  expect(await mainDeny(command, main)).toBeNull();
});

test("`git reset --hard` gets an ask that names the discarded work", async () => {
  const reason = await askReason(bash("git reset --hard"), NONE);
  expect(reason).toContain("moves or discards work");
  expect(reason).toContain("`git reset`");
});

test("a command with a hidden name gets an ask", async () => {
  for (const command of [
    "$(echo git) reset --hard",
    "$CMD reset",
    "$" + "{CMD} a",
  ]) {
    const reason = await askReason(bash(command), NONE);
    expect(reason, command).toContain("cannot read the name of a command");
  }
});

test("a command with a plain name gets no ask", async () => {
  expect(await askReason(bash("echo $(date)"), NONE)).toBeNull();
  expect(await askReason(bash("ls -la"), NONE)).toBeNull();
});
