// The unset of `CLAUDE_CODE_DISABLE_ADVISOR_TOOL` after a switch to `builtin` in one process.
// A lab test cannot do it, because the lab loads the options once for each test.

import { expect, test } from "bun:test";
import {
  keepOptions,
  onSessionStart,
} from "../../../src/plugins/claudetto/slices/advise/adapters/mod.ts";

const NAME = "CLAUDE_CODE_DISABLE_ADVISOR_TOOL";

/** A stub `$`: `deny` is what `env.set` answers, and the lists hold the calls. */
const stub = (deny?: string) => {
  const sets: string[] = [];
  const logs: string[] = [];
  const $ = {
    env: {
      set: async (name: string, value: string | undefined) => {
        sets.push(`${name}=${value}`);
        return deny === undefined ? {} : { deny };
      },
    },
    tool: { register: async () => ({}) },
    ui: { log: (text: string) => logs.push(text) },
  };
  return { $, sets, logs };
};

const start = async (
  advisor: string,
  s: ReturnType<typeof stub>,
): Promise<void> => {
  keepOptions({ advisor });
  await (onSessionStart as unknown as (...a: unknown[]) => Promise<unknown>)(
    s.$,
    {},
    async () => ({}),
  );
};

test("a switch to `builtin` unsets the var that the module set, once", async () => {
  const a = stub();
  await start("claudetto", a);
  expect(a.sets).toEqual([`${NAME}=1`]);
  const b = stub();
  await start("builtin", b);
  expect(b.sets).toEqual([`${NAME}=undefined`]);
  const c = stub();
  await start("builtin", c);
  expect(c.sets).toEqual([]);
});

test("a `deny` of the unset goes to `ui.log`, and the flag stays", async () => {
  await start("claudetto", stub());
  const denied = stub("managed");
  await start("builtin", denied);
  expect(denied.logs).toHaveLength(1);
  expect(denied.logs[0]).toContain("managed");
  const again = stub();
  await start("builtin", again);
  expect(again.sets).toEqual([`${NAME}=undefined`]);
});

test("`builtin` as the first start leaves the var alone", async () => {
  const s = stub();
  await start("builtin", s);
  expect(s.sets).toEqual([]);
});
