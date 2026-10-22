// The fault tests of the texts and the hooks that the core plugin ships (task 2.1 of change `0-3-0`).
// Each test names its fault of `.claudetto/0.3.0-findings.md` ("fault N") or `research/sessions.md` ("F N"),
// and it failed on `v0.2.0` (`test.failing`).
// The task that fixes a fault changes its `test.failing` to `test`.

import { expect, test } from "bun:test";
import path from "node:path";
import { PLUGINS, walk } from "../../support/repo.ts";

const CORE = path.join(PLUGINS, "claudetto");

/** Each text file that the core plugin ships, with its text: no test, no eval case. */
const shipped = (): Promise<[string, string][]> =>
  Promise.all(
    walk(CORE, { skip: ["node_modules", "tests", "evals", "types"] })
      .filter((f) => /\.(md|ts|json|ya?ml)$/.test(f) || !path.extname(f))
      .map(
        async (f): Promise<[string, string]> => [
          path.relative(CORE, f),
          await Bun.file(f).text(),
        ],
      ),
  );

const read = async (file: string): Promise<string> => {
  const at = Bun.file(path.join(CORE, file));
  return (await at.exists()) ? at.text() : "";
};

const register = (): Promise<string> => read("hooks/register.ts");

// Fixed by task 3.2.
test("fault 20: no memory text ships while memory is off", async () => {
  expect((await shipped()).filter(([file]) => /memory/i.test(file))).toEqual(
    [],
  );
});

// Fixed by task 3.2.
test("fault 30: no `command.describe` hook hides commands", async () => {
  expect(await register()).not.toContain('"command.describe"');
});

// Fixed by task 3.3.
test("fault 44: no hook rewrites the system sections one at a time", async () => {
  expect(await register()).not.toContain('"prompt.section"');
});

// Fixed by task 6.1.
test("faults 8, 11, F04, F11, F23, and F24: each session runs as `claudetto:main`", async () => {
  const settings = JSON.parse((await read("settings.json")) || "{}");
  expect(settings.agent).toBe("claudetto:main");
});
