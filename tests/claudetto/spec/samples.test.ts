// The sample change of each preset passes `openspec validate --strict` and reaches `isComplete`.

import { expect, test } from "bun:test";
import {
  openspec,
  SAMPLE_CHANGES,
  sampleProject,
} from "../../support/openspec.ts";

test.each(
  Object.entries(SAMPLE_CHANGES) as [keyof typeof SAMPLE_CHANGES, string][],
)(
  "the sample of the preset `%s` validates and has each artifact done",
  async (preset, change) => {
    const root = await sampleProject([preset]);
    const valid = await openspec(root, ["validate", "--all", "--strict"]);
    expect(valid.out).toContain(change);
    expect(valid.code).toBe(0);
    const status = await openspec(root, [
      "status",
      "--change",
      change,
      "--json",
    ]);
    expect(status.code).toBe(0);
    const json = JSON.parse(status.out);
    expect(json.isComplete).toBe(true);
    expect(json.schemaName).toBe(preset);
  },
  60_000,
);
