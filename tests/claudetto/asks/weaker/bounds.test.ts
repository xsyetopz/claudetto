// Review payloads for the ask on a changed limits file (package P36).
// A change of the value of a bound asks, also a lower value.
// Files are strings and no file is read.

import { expect, test } from "bun:test";
import { editAsks } from "../calls.ts";

/** `[title, file, text, old, new]` for an `Edit` that must get an ask. */
type Case = [string, string, string, string, string];

const ASKS: Case[] = [
  [
    "limits raise",
    "/w/src/x/limits.ts",
    "export const MAX = 100;\n",
    "100",
    "1000",
  ],
  [
    "limits raise sep",
    "/w/src/x/limits.ts",
    "export const MAX = 100;\n",
    "100",
    "1_000",
  ],
  [
    "limits raise Infinity",
    "/w/src/x/limits.ts",
    "export const MAX = 100;\n",
    "100",
    "Infinity",
  ],
  [
    "limits raise expr",
    "/w/src/x/limits.ts",
    "export const MAX = 100;\n",
    "100",
    "10 ** 6",
  ],
  [
    "limits min lower",
    "/w/src/x/limits.ts",
    "export const MIN_COVERAGE = 80;\n",
    "80",
    "10",
  ],
  [
    "limits rename",
    "/w/src/x/limits.ts",
    "export const MAX = 100;\nexport const MIN = 5;\n",
    "export const MAX = 100;\n",
    "",
  ],
  [
    "limits other",
    "/w/src/x/limits.ts",
    "export const MAX = 100;\n",
    "100",
    "Number.MAX_SAFE_INTEGER",
  ],
  [
    "limits lower",
    "/w/src/x/limits.ts",
    "export const MAX = 100;\n",
    "100",
    "50",
  ],
];

for (const [title, file, text, old, now] of ASKS)
  test(`the review payload \`${title}\` gets an ask`, async () => {
    expect(await editAsks(file, text, old, now)).toBe(true);
  });

test("a format change and a comment of a limits file get no ask", async () => {
  const file = "/w/src/x/limits.ts";
  const text = "export const MAX = 100;\n";
  expect(await editAsks(file, text, "MAX = 100", "MAX   =   100")).toBe(false);
  expect(await editAsks(file, text, "export", "// c\nexport")).toBe(false);
});
