// The fixtures of rules 1 and 2 break each rule of `tests/support/lib-feature-imports.ts` with a violation.
// These rules guard the `lib/` and `features/` folders of the 0.28.0 core plugin, so this file goes with them.

import { expect, test } from "bun:test";
import { checkFeatures, checkLib } from "../support/lib-feature-imports.ts";

const P = "plugins/dotclaude";

test("rule 1: lib importing a feature is a violation", () => {
  const files = {
    [`${P}/lib/a.ts`]: 'import { x } from "../features/guard/rules.ts";',
    [`${P}/lib/b.ts`]: 'import { y } from "./a.ts";\nimport fs from "node:fs";',
    [`${P}/features/guard/rules.ts`]: "export const x = 1;",
  };
  expect(checkLib(files)).toStrictEqual([
    `${P}/lib/a.ts: lib imports ../features/guard/rules.ts, and lib imports only lib`,
  ]);
});

test("rule 2: a feature importing another feature is a violation", () => {
  const files = {
    [`${P}/features/guard/rules.ts`]:
      'import { x } from "../prompt/data.ts";\nimport { y } from "../../lib/b.ts";\nimport { z } from "./own.ts";',
  };
  expect(checkFeatures(files)).toStrictEqual([
    `${P}/features/guard/rules.ts: feature guard imports ../prompt/data.ts, outside lib and itself`,
  ]);
});
