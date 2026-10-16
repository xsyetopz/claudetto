// claudetto-browser: with the `cloakbrowser` backend, the hooks module replaces `WebSearch` with a search in CloakBrowser.
// The lab (`plugins/claudetto-browser/tests/`) runs the two scenarios of the hook.

import { expect, test } from "bun:test";
import path from "node:path";
import type { On } from "claude-code";
import { register } from "../../plugins/claudetto-browser/hooks/register.ts";
import { PLUGINS } from "../support/repo.ts";

const ROOT = path.join(PLUGINS, "claudetto-browser");

/** The run of one browser step that a fake gives: the fields that the hook reads. */
interface FakeRun {
  exitCode?: number;
  stdout?: string;
  stderr?: string;
}

/** The handler that `register` gives, called with a fake engine, an event, and `next`. */
type Handler = (
  engine: unknown,
  e: unknown,
  next: (e: unknown) => unknown,
) => Promise<unknown>;

/** A fake engine: `process.run` records each argument vector, and the folder of builds has one CloakBrowser build. */
const fakeEngine = (run: (cmd: string[]) => FakeRun) => {
  const argv: string[][] = [];
  return {
    argv,
    $: {
      tool: { check: async () => ({ decision: "allow" }) },
      ui: { log: () => undefined },
      env: { get: async () => "/home/me" },
      fs: {
        exists: async () => true,
        list: async () => [{ name: "chromium-1.0.0", kind: "dir" }],
      },
      process: {
        run: async (cmd: string[]) => {
          argv.push(cmd);
          return {
            exitCode: 0,
            stderr: "",
            isStdoutTruncated: false,
            isStderrTruncated: false,
            ...run(cmd),
          };
        },
      },
    },
  };
};

/** The arguments of one `on` call: the event, the matcher, and the handler. */
type Registered = [event: unknown, matcher: unknown, handler: Handler];

/** Registers the hooks module on a fake `on`, and gives the arguments of each call. */
const registrations = () => {
  const registered: Registered[] = [];
  // The fake records the arguments and gives no `Registration`, so the cast skips the return type.
  const on = ((...args: Registered) => {
    registered.push(args);
  }) as unknown as On;
  register(on, { backend: "cloakbrowser" });
  return registered;
};

/** Gives the handler of the first registration, which is the `WebSearch` hook. */
const webSearchHandler = (): Handler => {
  const [first] = registrations();
  if (first === undefined)
    throw new Error("the hooks module registered no handler");
  return first[2];
};

test("the hooks module is the only module", async () => {
  const hooks = await Bun.file(path.join(ROOT, "hooks/hooks.json")).json();
  expect(hooks.modules).toStrictEqual(["./register.ts"]);
});

test("the hooks module registers one `tool.call` handler for `WebSearch`", () => {
  const registered = registrations();
  expect(registered.length).toBe(1);
  const [first] = registered;
  expect(first?.[0]).toBe("tool.call");
  expect(first?.[1]).toStrictEqual({ tool: "WebSearch" });
  expect(typeof first?.[2]).toBe("function");
});

test("a search that the browser answers gives a result and does not call `next`", async () => {
  const handler = webSearchHandler();
  const engine = fakeEngine(() => ({
    stdout: "Bun v1.4.3 release notes\nhttps://bun.com/blog/bun-v1.4.3",
  }));
  let nextCalls = 0;
  const out = (await handler(
    engine.$,
    { tool: "WebSearch", query: "bun release" },
    () => {
      nextCalls++;
    },
  )) as { result?: unknown };
  expect(nextCalls).toBe(0);
  expect(out.result, JSON.stringify(out)).toBeTruthy();
  expect(engine.argv.length > 0, "the browser ran").toBeTruthy();
});

test("a search that the browser fails passes to the built-in `WebSearch` through `next`, with a notice", async () => {
  const handler = webSearchHandler();
  const engine = fakeEngine(() => ({ exitCode: 1, stderr: "no browser" }));
  const event = { tool: "WebSearch", query: "bun release" };
  const out = (await handler(engine.$, event, (e) => ({ passed: e }))) as {
    passed?: unknown;
    context?: string[];
  };
  expect(out.passed).toStrictEqual(event);
  expect(out.context?.[0]).toContain("no browser");
});

test("the import graph of the hooks module has no `node:` import", async () => {
  const files = [
    "hooks/register.ts",
    "slices/search/domain/search.ts",
    "slices/search/limits.ts",
  ];
  for (const file of files)
    expect(await Bun.file(path.join(ROOT, file)).text()).not.toMatch(
      /from "node:|require\(/,
    );
});
