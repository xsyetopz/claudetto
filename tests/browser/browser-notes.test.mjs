// dotclaude-browser: the hooks module replaces `WebSearch` with the headless browser.
// The lab (`plugins/dotclaude-browser/tests/`) runs the two scenarios of the hook.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { register } from "../../plugins/dotclaude-browser/hooks/register.mjs";
import { PLUGINS } from "../support/repo.mjs";

const ROOT = path.join(PLUGINS, "dotclaude-browser");

/** A fake engine: `process.run` records each argument vector, and a missing folder of builds gives no binary. */
function fakeEngine(run) {
  const argv = [];
  return {
    argv,
    $: {
      env: { get: async () => "/home/me" },
      fs: { exists: async () => false, list: async () => [] },
      process: {
        run: async (cmd) => {
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
}

/** Registers the hooks module on a fake `on`, and gives the handler of `WebSearch`. */
function registrations() {
  const registered = [];
  register((...args) => registered.push(args));
  return registered;
}

test("the hooks module is the only module", () => {
  const hooks = JSON.parse(
    fs.readFileSync(path.join(ROOT, "hooks/hooks.json"), "utf8"),
  );
  assert.deepEqual(hooks.modules, ["./register.mjs"]);
});

test("the hooks module registers one `tool.call` handler for `WebSearch`", () => {
  const registered = registrations();
  assert.equal(registered.length, 1);
  const [event, matcher, handler] = registered[0];
  assert.equal(event, "tool.call");
  assert.deepEqual(matcher, { tool: "WebSearch" });
  assert.equal(typeof handler, "function");
});

test("a search that the browser answers gives a result and does not call `next`", async () => {
  const [, , handler] = registrations()[0];
  const engine = fakeEngine(() => ({
    stdout: "Bun v1.3.0 release notes\nhttps://bun.sh/blog/bun-v1.3",
  }));
  let nextCalls = 0;
  const out = await handler(engine.$, { query: "bun release" }, () => {
    nextCalls++;
  });
  assert.equal(nextCalls, 0);
  assert.ok(out.result, JSON.stringify(out));
  assert.ok(engine.argv.length > 0, "the browser ran");
});

test("a search that the browser fails passes to the built-in `WebSearch` through `next`", async () => {
  const [, , handler] = registrations()[0];
  const engine = fakeEngine(() => ({ exitCode: 1, stderr: "no browser" }));
  const event = { query: "bun release" };
  const out = await handler(engine.$, event, (e) => ({ passed: e }));
  assert.deepEqual(out, { passed: event });
});

test("the import graph of the hooks module has no `node:` import", () => {
  const files = [
    "hooks/register.mjs",
    "features/search/search.mjs",
    "features/search/limits.mjs",
  ];
  for (const file of files)
    assert.doesNotMatch(
      fs.readFileSync(path.join(ROOT, file), "utf8"),
      /from "node:|require\(/,
    );
});
