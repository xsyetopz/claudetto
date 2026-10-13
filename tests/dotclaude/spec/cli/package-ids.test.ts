// `specify` gives a short change the next free package ID, and `validate` reports an ID that two open changes share.

import { describe, expect, test } from "bun:test";
import {
  CHANGES,
  changeText,
  logText,
  makeChange,
  packageText,
  run,
} from "./read-fixture.ts";
import {
  eventsOf,
  exists,
  makeRepo,
  phase,
  pkgFile,
  setVerify,
  write,
} from "./run-phase.ts";

const planned = async (root: string, id: string): Promise<void> => {
  await phase(root, "specify", id, "--size", "trivial");
  await phase(root, "specify", id);
};

describe("the package ID of a short change", () => {
  test("two open short changes get different package IDs", async () => {
    const root = makeRepo();
    await planned(root, "c1");
    await planned(root, "c2");
    expect(exists(root, pkgFile("c1", "P1"))).toBe(true);
    expect(exists(root, pkgFile("c2", "P1"))).toBe(false);
    expect(exists(root, pkgFile("c2", "P2"))).toBe(true);
    await setVerify(root, "c2", "true", "P2");
    expect((await phase(root, "implement", "P2")).code).toBe(0);
    expect((await phase(root, "implement", "P1")).code).toBe(0);
    expect((await eventsOf(root, "c2")).at(-1)?.["package"]).toBe("P2");
  });

  test("an archived change keeps its ID used", async () => {
    const root = makeRepo();
    await write(
      root,
      `${CHANGES}/archive/2026-10-01-old/packages/P7.md`,
      "old\n",
    );
    await planned(root, "c1");
    expect(exists(root, pkgFile("c1", "P8"))).toBe(true);
    expect(exists(root, pkgFile("c1", "P1"))).toBe(false);
  });
});

describe("validate and a package ID that two open changes share", () => {
  const two = (second: string): Promise<string> =>
    makeChange([{ id: "P1" }], {
      files: {
        [`${CHANGES}/c2/change.md`]: changeText("c2", second),
        [`${CHANGES}/c2/events.jsonl`]: logText(second, []),
        [`${CHANGES}/c2/packages/P1.md`]: packageText({ id: "P1" }),
      },
    });

  test("is reported with both changes named", async () => {
    const r = await run(await two("planned"), "validate");
    expect(r.code).toBe(1);
    expect(r.err.join("\n")).toMatch(/P1.*c1.*c2/);
  });

  test("is not reported when the other change is closed", async () => {
    const r = await run(await two("canceled"), "validate");
    expect(r.err.join("\n")).not.toContain("c1, c2");
  });
});
