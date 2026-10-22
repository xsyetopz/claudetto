// The pure parts of the edit ledger (spec `session-hygiene`, "Edit Ledger").

import { expect, test } from "bun:test";
import {
  changedFiles,
  GONE,
  hash64,
  type Ledger,
  withEdit,
  withTold,
} from "../../../plugins/claudetto/slices/hygiene/domain/ledger.ts";
import { LEDGER_MAX_FILES } from "../../../plugins/claudetto/slices/hygiene/limits.ts";

/** FNV-1a with 64 bits on BigInt, over the same code units. */
const reference = (text: string): string => {
  let h = 0xcbf29ce484222325n;
  for (let i = 0; i < text.length; i++) {
    h ^= BigInt(text.charCodeAt(i));
    h = BigInt.asUintN(64, h * 0x100000001b3n);
  }
  return h.toString(16).padStart(16, "0");
};

test("`hash64` gives the published FNV-1a vectors", () => {
  expect(hash64("")).toBe("cbf29ce484222325");
  expect(hash64("a")).toBe("af63dc4c8601ec8c");
  expect(hash64("foobar")).toBe("85944171f73967e8");
});

test("`hash64` equals the BigInt hash for text of many shapes", () => {
  const samples = [
    "const a = 1;\n",
    "é€😀\u0000￿",
    "x".repeat(10_000),
    Array.from({ length: 2000 }, (_, i) => String.fromCharCode(i * 31)).join(
      "",
    ),
  ];
  for (const s of samples) expect(hash64(s)).toBe(reference(s));
});

test("`hash64` differs for text that differs by one unit", () => {
  expect(hash64("const a = 1;")).not.toBe(hash64("const a = 1"));
});

test("`withEdit` moves the file to the end and keeps `LEDGER_MAX_FILES` entries", () => {
  let ledger: Ledger = {};
  for (let i = 0; i < LEDGER_MAX_FILES + 5; i++)
    ledger = withEdit(ledger, `/f${i}`, "h", "main");
  expect(Object.keys(ledger).length).toBe(LEDGER_MAX_FILES);
  expect(Object.keys(ledger)[0]).toBe("/f5");
  ledger = withEdit(ledger, "/f5", "h2", "main");
  expect(Object.keys(ledger).at(-1)).toBe("/f5");
  expect(ledger["/f5"]).toStrictEqual({ hash: "h2", agent: "main" });
});

test("`changedFiles` skips a file that matches, and a hash that the agent knows", () => {
  const ledger: Ledger = {
    "/a": { hash: "1", agent: "main" },
    "/b": { hash: "1", agent: "main", told: "2" },
    "/c": { hash: "1", agent: "w" },
    "/d": { hash: "1", agent: "main" },
  };
  const now = { "/a": "1", "/b": "2", "/c": GONE };
  expect(changedFiles(ledger, now)).toStrictEqual([{ path: "/c", agent: "w" }]);
});

test("`withTold` keeps the new hash, so the same change gives one line", () => {
  const ledger: Ledger = { "/a": { hash: "1", agent: "main" } };
  const now = { "/a": "2" };
  const told = withTold(ledger, changedFiles(ledger, now), now);
  expect(told["/a"]).toStrictEqual({ hash: "1", agent: "main", told: "2" });
  expect(changedFiles(told, now)).toStrictEqual([]);
});
