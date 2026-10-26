// `dev/unsandboxed.ts`: an eval run inside the Bash sandbox of Claude Code stops before it spends money.

import { expect, test } from "bun:test";
import { sandboxProxy } from "../../dev/unsandboxed.ts";

const IN_CLAUDE = { CLAUDE_CODE_ENTRYPOINT: "cli" };

test("a shell of Claude Code with a local HTTPS proxy is the sandbox", () => {
  for (const url of [
    "http://user:pass@localhost:54655",
    "http://127.0.0.1:8080",
    "http://[::1]:9",
  ])
    expect(sandboxProxy({ ...IN_CLAUDE, HTTPS_PROXY: url }), url).toBeTruthy();
  expect(
    sandboxProxy({ ...IN_CLAUDE, https_proxy: "http://localhost:1" }),
  ).toBe("localhost:1");
});

test("a terminal, a remote proxy, or a value that is not a URL is not the sandbox", () => {
  expect(sandboxProxy({ HTTPS_PROXY: "http://localhost:1" })).toBe(null);
  expect(sandboxProxy(IN_CLAUDE)).toBe(null);
  expect(
    sandboxProxy({ ...IN_CLAUDE, HTTPS_PROXY: "http://proxy.corp:3128" }),
  ).toBe(null);
  expect(sandboxProxy({ ...IN_CLAUDE, HTTPS_PROXY: "not a url" })).toBe(null);
});
