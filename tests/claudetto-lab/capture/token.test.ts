// Pins that a session through `claudetto-capture` leaves no login token in the log (task 15.1).
// The upstream is a fake that echoes the `authorization` header in its error body, which is the worst case for the log.
// The token is a fixture value, and no test sends it to a real endpoint.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { redact } from "../../../src/plugins/claudetto-lab/slices/capture/domain/count.ts";
import { PLUGINS, tmpDir } from "../../support/repo.ts";

const TOOL = path.join(PLUGINS, "claudetto-lab", "bin", "claudetto-capture");
const TOKEN = "sk-ant-oat01-FIXTURE-TOKEN-4711";

/** A fake upstream. A `count_tokens` call gets HTTP 400 with the received `authorization` header in the body. */
const echoUpstream = () => {
  const server = Bun.serve({
    port: 0,
    hostname: "127.0.0.1",
    async fetch(req) {
      await req.text();
      if (new URL(req.url).pathname.endsWith("/count_tokens"))
        return new Response(
          `bad credential ${req.headers.get("authorization")} and ${req.headers.get("x-api-key")}`,
          { status: 400 },
        );
      return Response.json({ ok: true });
    },
  });
  return { url: `http://127.0.0.1:${server.port}`, server };
};

/** The files of `dir` as `[name, text]` pairs. */
const textsOf = async (dir: string): Promise<[string, string][]> =>
  Promise.all(
    fs
      .readdirSync(dir)
      .map(
        async (f): Promise<[string, string]> => [
          f,
          await Bun.file(path.join(dir, f)).text(),
        ],
      ),
  );

test("the log of a stubbed session holds no login token, also when the upstream echoes it", async () => {
  const up = echoUpstream();
  const out = tmpDir("capture-token");
  const probe = Bun.serve({
    port: 0,
    hostname: "127.0.0.1",
    fetch: () => new Response(),
  });
  const port = probe.port;
  probe.stop(true);
  const child = Bun.spawn(
    [
      process.execPath,
      "--no-env-file",
      TOOL,
      "--port",
      String(port),
      "--out",
      out,
      "--upstream",
      up.url,
    ],
    { stdin: "ignore", stdout: "pipe", stderr: "pipe" },
  );
  try {
    // Wait for the line that says the proxy listens.
    const reader = (child.stdout as ReadableStream<Uint8Array>).getReader();
    let said = "";
    while (!said.includes("capture: http")) {
      const chunk = await reader.read();
      if (chunk.done) break;
      said += Buffer.from(chunk.value).toString("utf8");
    }
    const res = await fetch(`http://127.0.0.1:${port}/v1/messages`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${TOKEN}`,
        "x-api-key": TOKEN,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-test",
        tools: [{ name: "t" }],
        messages: [{ role: "user", content: "hello" }],
      }),
    });
    expect(res.status).toBe(200);
    // The sizing fails in the background, and the proxy keeps the error in `error-<n>.txt`.
    for (
      let i = 0;
      i < 100 && !fs.readdirSync(out).some((f) => /^error-/.test(f));
      i++
    )
      await Bun.sleep(50);
    const files = await textsOf(out);
    expect(
      files.some(([f]) => /^error-/.test(f)),
      "no error file",
    ).toBe(true);
    for (const [name, text] of files)
      expect(text.includes(TOKEN), `${name} holds the token`).toBe(false);
  } finally {
    child.kill();
    const rest = await new Response(child.stderr as ReadableStream).text();
    expect(rest.includes(TOKEN), "stderr holds the token").toBe(false);
    up.server.stop(true);
  }
});

test("`redact` removes the value of each credential header and the bare token of a bearer value", () => {
  const headers = { Authorization: `Bearer ${TOKEN}`, "x-api-key": "key-1" };
  const text = redact(`got Bearer ${TOKEN}, ${TOKEN}, key-1`, headers);
  expect(text).not.toContain(TOKEN);
  expect(text).not.toContain("key-1");
  expect(redact("no secret", headers)).toBe("no secret");
});
