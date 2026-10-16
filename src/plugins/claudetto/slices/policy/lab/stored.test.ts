// Lab tests of the `policy` slice: a stored verdict is reused while the policy files stay the same.
// The tests write a verdict file to the fake disk, and the hash comes from the code of the slice.

import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import { hashOf } from "../domain/verdict.ts";
import { denyOf, option, POLICY, push, stub, world } from "./world.ts";

/** Puts a stored verdict of `them/<name>` on the disk, with the hash of `text` or the given `hash`. */
const store = (
  disk: Record<string, string>,
  name: string,
  verdict: string,
  text: string,
  extra: { hash?: string; conditions?: string } = {},
) => {
  const key = `github.com/them/${name}`;
  disk[`/home/me/.claudetto/policy/github.com_them_${name}.json`] =
    JSON.stringify({
      repo: key,
      hash: extra.hash ?? hashOf([{ name: `${key}:AGENTS.md`, text }]),
      verdict,
      quote: verdict === "allowed" ? "" : text,
      conditions: extra.conditions ?? "",
      time: 1,
    });
};

test(
  // biome-ignore lint/plugin: a test name
  "a stored verdict with the same hash is reused with no new check",
  option(),
  async ($: Engine, on: On) => {
    const disk = stub(on, world("reuse"));
    store(disk, "reuse", "forbidden", POLICY);
    const deny = denyOf(await push($, "/work/reuse"));
    expect(deny).toContain("forbids");
    expect(deny).not.toContain("Read each file");
  },
);

test(
  // biome-ignore lint/plugin: a test name
  "a stored verdict with another hash asks again with the list of files",
  option(),
  async ($: Engine, on: On) => {
    const disk = stub(on, world("changed"));
    store(disk, "changed", "allowed", POLICY, { hash: "0000" });
    const deny = denyOf(await push($, "/work/changed"));
    expect(deny).toContain("/work/changed/AGENTS.md");
    expect(deny).toContain("mcp__claudetto__ai_policy");
  },
);

test(
  "a stored allowed verdict lets the push pass with no ask",
  option(),
  async ($: Engine, on: On) => {
    const disk = stub(on, world("okay"));
    store(disk, "okay", "allowed", POLICY);
    expect(denyOf(await push($, "/work/okay"))).toBeUndefined();
  },
);

test(
  // biome-ignore lint/plugin: a test name
  "a stored conditions verdict shows its conditions once, then the push passes",
  option(),
  async ($: Engine, on: On) => {
    const disk = stub(on, world("condstored"));
    store(disk, "condstored", "conditions", POLICY, {
      conditions: "Disclose the AI tool in the pull request.",
    });
    const first = denyOf(await push($, "/work/condstored"));
    expect(first).toContain("Disclose the AI tool in the pull request.");
    expect(denyOf(await push($, "/work/condstored"))).toBeUndefined();
  },
);
