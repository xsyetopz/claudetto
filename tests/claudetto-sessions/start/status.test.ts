// Tests of the end of a start report (sessions rows 84 and 85): a size bound with no snapshot fails, and a transcript with no data has its own status.

import { expect, test } from "bun:test";
import path from "node:path";
import { reportOf } from "../../../plugins/claudetto-sessions/slices/start-cost/domain/report.ts";
import { store } from "../../../src/plugins/claudetto-sessions/slices/start-cost/adapters/store.ts";
import { PLUGINS, tmpDir } from "../../support/repo.ts";
import { runBin } from "../spawn.ts";

const BIN = path.join(PLUGINS, "claudetto-sessions", "bin", "claudetto-start");

const write = async (name: string, entries: object[]): Promise<string> => {
  const file = path.join(tmpDir("status"), name);
  await Bun.write(
    file,
    `${entries.map((e) => JSON.stringify(e)).join("\n")}\n`,
  );
  return file;
};

const REQUEST = {
  type: "assistant",
  message: { id: "a", usage: { input_tokens: 5 }, content: [] },
};
const USER = { type: "user", message: { content: "hi" } };

test("`--text-max` fails and says so when the transcript has no snapshot", async () => {
  const file = await write("nosnap.jsonl", [REQUEST]);
  const result = await reportOf(store, file, undefined, { textMax: 1 });
  expect(result.status).toBe("over");
  expect(result.text).toContain("size not known");
  expect(runBin(BIN, [file, "--text-max", "1"]).status).toBe(1);
});

test("`--text-min` with no snapshot says so and does not fail", async () => {
  const file = await write("nosnap-min.jsonl", [REQUEST]);
  const result = await reportOf(store, file, undefined, { textMin: 1 });
  expect(result.status).toBe("ok");
  expect(result.text).toContain("size not known");
  expect(runBin(BIN, [file, "--text-min", "999999999"]).status).toBe(0);
});

test("a transcript with no request gives its own status, 2, and no bound is named", async () => {
  const file = await write("none.jsonl", [USER]);
  expect((await reportOf(store, file, undefined)).status).toBe("no-data");
  const out = runBin(BIN, [file]);
  expect(out.status).toBe(2);
  expect(out.stdout).toContain("No request with usage");
});
