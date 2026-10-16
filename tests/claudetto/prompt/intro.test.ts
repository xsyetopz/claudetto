// Tests of the intro rules of the variants (spec `prompt-profile`, "The intro rules stay"):
// each rule of the live `lean_body` block of Claude Code 2.1.301 has a transform part, and each variant has the text of that part.

import { expect, test } from "bun:test";
import { LIVE_LEAN_BODY } from "../../../plugins/claudetto/slices/prompt/domain/live-block.ts";
import {
  VARIANTS,
  variantSections,
} from "../../../plugins/claudetto/slices/prompt/domain/variants.ts";
import { PARTS } from "../../../plugins/claudetto/slices/prompt/transforms/lean_body.ts";

const KEYS = Object.keys(VARIANTS) as (keyof typeof VARIANTS)[];

const ROOT = "/p";

/** Each rule of the live block: a line that is not empty and not a heading. */
const RULES = LIVE_LEAN_BODY.split("\n").filter(
  (line) => line.trim() !== "" && !line.startsWith("#"),
);

/** The transform part whose anchor matches `rule`, or `undefined`. */
const partOf = (rule: string) =>
  PARTS.find((p) => new RegExp(p.anchor.source).test(rule));

test("the live block has the identity, the security rule, and the harness rules", () => {
  expect(RULES.length).toBe(8);
});

for (const rule of RULES) {
  test(`a transform part covers the rule "${rule.slice(0, 60)}"`, () => {
    expect(
      partOf(rule),
      `no part of \`lean_body\` covers: ${rule}`,
    ).toBeDefined();
  });
}

for (const k of KEYS) {
  test(`the ${k} variant has the text of each intro rule`, () => {
    const text = variantSections(k, ROOT)
      .map((s) => s.text)
      .join("\n");
    for (const rule of RULES) {
      const part = partOf(rule);
      expect(
        text.includes(part?.text ?? rule),
        `${k} has no text for: ${rule}`,
      ).toBe(true);
    }
  });
}
