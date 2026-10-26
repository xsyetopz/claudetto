#!/usr/bin/env -S bun --no-env-file
// Stops an eval run that starts inside the Bash sandbox of Claude Code, before it spends money.
//
//   bun dev/unsandboxed.ts   exit 0 outside the sandbox, else print the reason and exit 1
//
// The sandbox sends the model calls of each child session through its proxy on `localhost`.
// In the run of 2026-10-10 from `! just eval`, 10 runs stopped on a model call (`api_retry`, or a stream cut off)
// until the 600 s timeout of the case, in both arms, while the earlier runs with the sandbox off had no timeout.

const LOCAL = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** The host of the sandbox proxy when `env` is a shell of Claude Code that sends HTTPS through a local proxy, else null. */
export const sandboxProxy = (
  env: Record<string, string | undefined>,
): string | null => {
  const url = env["HTTPS_PROXY"] ?? env["https_proxy"];
  if (!url || !env["CLAUDE_CODE_ENTRYPOINT"]) return null;
  try {
    const { hostname, host } = new URL(url);
    return LOCAL.has(hostname) ? host : null;
  } catch {
    // A proxy value that is not a URL is not the proxy of the sandbox.
    return null;
  }
};

if (process.argv[1] === import.meta.path) {
  const host = sandboxProxy(process.env);
  if (host) {
    console.error(
      [
        `The eval did not start, because it runs in the Bash sandbox of Claude Code, and the model calls of its runs go through the proxy at ${host}.`,
        "In the sandbox, runs stop on a model call until the timeout of the case, so the scores are not valid.",
        "Run `just eval` in a terminal outside Claude Code.",
      ].join("\n"),
    );
    process.exitCode = 1;
  }
}
