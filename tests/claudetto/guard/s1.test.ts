// The S1 sample of the guard: the 368 distinct commands that the file-print deny of version 1.0.0 of the earlier name of the project refused in 37 sessions.
// 300 of them did more than print, so the compound command ran in full before the deny.
// No command runs. A command is denied only when each part of it is a bare print of one file.

import { expect, test } from "bun:test";
import other from "./s1-other.json" with { type: "json" };
import sed from "./s1-sed.json" with { type: "json" };
import { denyOf } from "./support.ts";

// The sample is in two files, to keep each file in its line bound: the commands that `sed` leads, and the others.
const sample = [...sed, ...other];

const CWD = "/work/app";
/** A part that only prints one file, or a plain `cd`. A pipe, a redirect, or a quote makes the part something else. */
const BARE =
  /^\s*(?:cd\s+\S+|cat\s+[\w./+-]+|head(?:\s+-n?\s*\d+)?\s+[\w./+-]+|tail(?:\s+-n?\s*[+]?\d+)?\s+[\w./+-]+|sed\s+-n\s+'?\d+(?:,\d+)?p'?\s+[\w./+-]+)\s*$/;
const bareOnly = (command: string) =>
  command.split(/&&|;|\n/).every((part) => !part.trim() || BARE.test(part));

test("the sample holds the 368 distinct commands", () => {
  expect(sample).toHaveLength(368);
});

test("no command of the sample gets a deny when a part of it does other work", async () => {
  const falseDeny: string[] = [];
  for (const command of sample) {
    if (bareOnly(command)) continue;
    if ((await denyOf(command, CWD, async () => 100)) !== null)
      falseDeny.push(command);
  }
  expect(falseDeny).toStrictEqual([]);
});

test("a command of the sample that only prints still gets the deny", async () => {
  const pure = sample.filter(bareOnly);
  expect(pure.length).toBeGreaterThan(0);
  for (const command of pure)
    expect(typeof (await denyOf(command, CWD, async () => 100)), command).toBe(
      "string",
    );
});
