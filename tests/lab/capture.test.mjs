// Tests of `dotclaude-capture` (task 28.4): the proxy runs as a child against a local fake upstream.
// Nothing here uses the network or a real credential.

import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { test } from "node:test";
import { parts } from "../../plugins/dotclaude-lab/features/capture/report.mjs";
import { resolveUpstream } from "../../plugins/dotclaude-lab/features/capture/upstream.mjs";
import { PLUGINS, tmpDir } from "../support/repo.mjs";

const TOOL = path.join(PLUGINS, "dotclaude-lab", "bin", "dotclaude-capture");

/** A fake upstream that records each request and answers with JSON. */
async function fakeUpstream() {
  const seen = [];
  const server = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    seen.push({
      url: req.url,
      headers: req.headers,
      body: Buffer.concat(chunks).toString("utf8"),
    });
    res.writeHead(200, { "content-type": "application/json" });
    res.end('{"ok":true}');
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return { seen, server, url: `http://127.0.0.1:${server.address().port}` };
}

async function freePort() {
  const s = http.createServer();
  await new Promise((r) => s.listen(0, "127.0.0.1", r));
  const { port } = s.address();
  await new Promise((r) => s.close(r));
  return port;
}

/** Start the proxy and wait for its `capture:` line. */
async function startProxy(upstream, out) {
  const port = await freePort();
  const child = spawn(
    process.execPath,
    [
      TOOL,
      "--port",
      String(port),
      "--out",
      out,
      "--upstream",
      upstream,
      "--no-count",
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  let text = "";
  await new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("exit", () => reject(new Error(`proxy exited: ${text}`)));
    for (const stream of [child.stdout, child.stderr])
      stream.on("data", (d) => {
        text += d;
        if (text.includes(`capture: http://127.0.0.1:${port}`)) resolve();
      });
  });
  return { child, base: `http://127.0.0.1:${port}` };
}

const body = {
  model: "claude-test",
  system: [{ type: "text", text: "be brief" }],
  messages: [{ role: "user", content: "hello" }],
};

test("the proxy saves the body of each `/v1/messages` request, writes no header, and forwards only allowed headers", async () => {
  const up = await fakeUpstream();
  const out = tmpDir("capture");
  const { child, base } = await startProxy(up.url, out);
  try {
    const res = await fetch(`${base}/v1/messages`, {
      method: "POST",
      headers: {
        authorization: "Bearer SECRET-TOKEN",
        "x-api-key": "SECRET-KEY",
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
        cookie: "session=private",
        "x-custom": "private",
      },
      body: JSON.stringify(body),
    });
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true });

    assert.equal(up.seen.length, 1);
    const [got] = up.seen;
    assert.equal(got.url, "/v1/messages");
    assert.deepEqual(JSON.parse(got.body), body);
    assert.equal(got.headers.authorization, "Bearer SECRET-TOKEN");
    assert.equal(got.headers["x-api-key"], "SECRET-KEY");
    assert.equal(got.headers["anthropic-version"], "2023-06-01");
    assert.equal(got.headers.cookie, undefined);
    assert.equal(got.headers["x-custom"], undefined);

    const files = fs.readdirSync(out);
    const saved = files.filter((f) => /^request-.*\.json$/.test(f));
    assert.equal(saved.length, 1, files.join(", "));
    assert.deepEqual(
      JSON.parse(fs.readFileSync(path.join(out, saved[0]))),
      body,
    );
    for (const f of files) {
      const text = fs.readFileSync(path.join(out, f), "utf8");
      assert.ok(!text.includes("SECRET"), `${f} holds a credential`);
      assert.ok(!text.includes("session=private"), `${f} holds a header`);
    }
  } finally {
    child.kill();
    up.server.close();
  }
});

test("a request to another path is forwarded and not saved", async () => {
  const up = await fakeUpstream();
  const out = tmpDir("capture");
  const { child, base } = await startProxy(up.url, out);
  try {
    const res = await fetch(`${base}/v1/other`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    assert.equal(res.status, 200);
    assert.equal(up.seen[0].url, "/v1/other");
    assert.deepEqual(JSON.parse(up.seen[0].body), body);
    assert.deepEqual(
      fs.readdirSync(out).filter((f) => f.startsWith("request-")),
      [],
    );
  } finally {
    child.kill();
    up.server.close();
  }
});

test("a request splits into parts for the system, the tools, and the messages", () => {
  const request = {
    model: "m",
    system: [
      { type: "text", text: "first" },
      { type: "text", text: "second" },
    ],
    tools: [{ name: "Bash" }, { name: "Later", defer_loading: true }],
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "one" },
          { type: "text", text: "two" },
        ],
      },
      { role: "assistant", content: "only block" },
    ],
  };
  const list = parts(request);
  assert.deepEqual(
    list.map((p) => [p.kind, p.name]),
    [
      ["system", "text: first"],
      ["system", "text: second"],
      ["tool", "Bash"],
      ["tool (deferred)", "Later"],
      ["message 0 (user)", "text: one"],
      ["message 0 (user)", "text: two"],
    ],
  );
  // `without` returns the request with one part removed and the rest intact.
  assert.deepEqual(list[1].without().system, [request.system[0]]);
  assert.deepEqual(list[2].without().tools, [request.tools[1]]);
  assert.deepEqual(list[4].without().messages[0].content, [
    request.messages[0].content[1],
  ]);
  assert.deepEqual(list[4].without().messages[1], request.messages[1]);
});

test("a long text block splits by section, and the only block of a message stays", () => {
  const filler = "x".repeat(1200);
  const text = `intro\n${filler}\n# Part A\n${filler}\n# Part B\nend`;
  const request = {
    model: "m",
    messages: [{ role: "user", content: [{ type: "text", text }] }],
  };
  const list = parts(request);
  assert.equal(list.length, 3);
  assert.deepEqual(
    list.map((p) => p.name.replace(/x+/, "x")),
    ["section: intro x", "section: # Part A x", "section: # Part B end"],
  );
  assert.deepEqual(
    list.map((p) => p.chars),
    [
      `intro\n${filler}`.length,
      `# Part A\n${filler}`.length,
      "# Part B\nend".length,
    ],
  );
  const rest = list[1].without().messages[0].content[0].text;
  assert.equal(rest, `intro\n${filler}\n# Part B\nend`);
});

test("the upstream is the flag, then `ANTHROPIC_BASE_URL`, then the Anthropic API", () => {
  const port = 8787;
  assert.equal(
    resolveUpstream({ flag: "http://a.test/", baseUrl: "http://b.test", port }),
    "http://a.test",
  );
  assert.equal(
    resolveUpstream({ baseUrl: "http://b.test", port }),
    "http://b.test",
  );
  assert.equal(resolveUpstream({ port }), "https://api.anthropic.com");
});

test("an upstream that is the address of the proxy is refused", () => {
  for (const url of [
    "http://127.0.0.1:8787",
    "http://localhost:8787/",
    "http://[::1]:8787",
  ]) {
    assert.throws(() => resolveUpstream({ baseUrl: url, port: 8787 }), /loop/);
    assert.throws(() => resolveUpstream({ flag: url, port: 8787 }), /loop/);
  }
  // Another port on the same host is a real upstream.
  assert.equal(
    resolveUpstream({ baseUrl: "http://127.0.0.1:9000", port: 8787 }),
    "http://127.0.0.1:9000",
  );
});

test("the proxy stops with an error when `ANTHROPIC_BASE_URL` is its own address", async () => {
  const port = await freePort();
  const out = tmpDir("capture");
  const r = spawnSync(
    process.execPath,
    [TOOL, "--port", String(port), "--out", out],
    {
      env: { ...process.env, ANTHROPIC_BASE_URL: `http://127.0.0.1:${port}` },
      encoding: "utf8",
    },
  );
  assert.equal(r.status, 1);
});
