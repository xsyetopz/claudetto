// Tests of the bounds and the exports of the sessions add-on (sessions row 88): `TIMEOUT_MS` is in `limits.ts`, and the 3 unused exports are gone.

import { expect, test } from "bun:test";

const SLICES = "src/plugins/claudetto-sessions/slices";

test("each CLI slice keeps `TIMEOUT_MS` in its `limits.ts`, and its handler has no copy", async () => {
  for (const slice of ["start-cost", "usage"]) {
    const limits = await import(`../../${SLICES}/${slice}/limits.ts`);
    expect(limits.TIMEOUT_MS).toBe(120_000);
    const handler = await Bun.file(`${SLICES}/${slice}/adapters/mod.ts`).text();
    expect(handler).not.toMatch(/const TIMEOUT_MS/);
    expect(handler).toContain('from "../limits.ts"');
  }
});

test("the usage transcript module has no export that nothing uses", async () => {
  const transcript = await import(`../../${SLICES}/usage/domain/transcript.ts`);
  for (const name of ["contextOf", "charsOf", "toolCalls"])
    expect(Object.keys(transcript)).not.toContain(name);
});
