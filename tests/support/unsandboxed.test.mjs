// `tools/unsandboxed.mjs`: an eval run inside the Bash sandbox of Claude Code stops before it spends money.

import assert from "node:assert/strict";
import { test } from "node:test";
import { sandboxProxy } from "../../tools/unsandboxed.mjs";

const IN_CLAUDE = { CLAUDE_CODE_ENTRYPOINT: "cli" };

test("a shell of Claude Code with a local HTTPS proxy is the sandbox", () => {
  for (const url of [
    "http://user:pass@localhost:54655",
    "http://127.0.0.1:8080",
    "http://[::1]:9",
  ])
    assert.ok(sandboxProxy({ ...IN_CLAUDE, HTTPS_PROXY: url }), url);
  assert.equal(
    sandboxProxy({ ...IN_CLAUDE, https_proxy: "http://localhost:1" }),
    "localhost:1",
  );
});

test("a terminal, a remote proxy, or a value that is not a URL is not the sandbox", () => {
  assert.equal(sandboxProxy({ HTTPS_PROXY: "http://localhost:1" }), null);
  assert.equal(sandboxProxy(IN_CLAUDE), null);
  assert.equal(
    sandboxProxy({ ...IN_CLAUDE, HTTPS_PROXY: "http://proxy.corp:3128" }),
    null,
  );
  assert.equal(sandboxProxy({ ...IN_CLAUDE, HTTPS_PROXY: "not a url" }), null);
});
