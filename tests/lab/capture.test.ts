// Tests of `dotclaude-capture` (task 28.4): the proxy runs as a child against a local fake upstream.
// Nothing here uses the network or a real credential.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { parts } from "../../src/plugins/dotclaude-lab/slices/capture/domain/report.ts";
import type {
  Block,
  Body,
  Message,
  Part,
} from "../../src/plugins/dotclaude-lab/slices/capture/domain/types.ts";
import { resolveUpstream } from "../../src/plugins/dotclaude-lab/slices/capture/domain/upstream.ts";
import { PLUGINS, tmpDir } from "../support/repo.ts";

const TOOL = path.join(PLUGINS, "dotclaude-lab", "bin", "dotclaude-capture");

/** The item at `i`, which the tests below know exists. */
const item = <T>(list: readonly T[], i: number): T => list[i] as T;

/** One request that the fake upstream received. */
type Seen = {
  url: string;
  headers: Record<string, string>;
  body: string;
};

/** A fake upstream that records each request and answers with JSON. */
const fakeUpstream = async () => {
  const seen: Seen[] = [];
  const server = Bun.serve({
    port: 0,
    hostname: "127.0.0.1",
    async fetch(req) {
      seen.push({
        url: new URL(req.url).pathname,
        headers: Object.fromEntries(req.headers),
        body: await req.text(),
      });
      return new Response('{"ok":true}', {
        headers: { "content-type": "application/json" },
      });
    },
  });
  return { seen, server, url: `http://127.0.0.1:${server.port}` };
};

const freePort = async () => {
  const s = Bun.serve({
    port: 0,
    hostname: "127.0.0.1",
    fetch: () => new Response(),
  });
  const { port } = s;
  s.stop();
  return port;
};

/** Start the proxy and wait for its `capture:` line. */
const startProxy = async (upstream: string, out: string) => {
  const port = await freePort();
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
      upstream,
      "--no-count",
    ],
    { stdin: "ignore", stdout: "pipe", stderr: "pipe" },
  );
  let text = "";
  await new Promise<void>((resolve, reject) => {
    child.exited.then(() => reject(new Error(`proxy exited: ${text}`)));
    const read = async (stream: ReadableStream<Uint8Array>) => {
      for await (const chunk of stream) {
        text += Buffer.from(chunk).toString("utf8");
        if (text.includes(`capture: http://127.0.0.1:${port}`)) resolve();
      }
    };
    read(child.stdout);
    read(child.stderr);
  });
  return { child, base: `http://127.0.0.1:${port}` };
};

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
    expect(res.status).toBe(200);
    expect(await res.json()).toStrictEqual({ ok: true });

    expect(up.seen.length).toBe(1);
    const got = up.seen[0] as Seen;
    expect(got.url).toBe("/v1/messages");
    expect(JSON.parse(got.body)).toStrictEqual(body);
    expect(got.headers["authorization"]).toBe("Bearer SECRET-TOKEN");
    expect(got.headers["x-api-key"]).toBe("SECRET-KEY");
    expect(got.headers["anthropic-version"]).toBe("2023-06-01");
    expect(got.headers["cookie"]).toBe(undefined);
    expect(got.headers["x-custom"]).toBe(undefined);

    const files = fs.readdirSync(out);
    const saved = files.filter((f) => /^request-.*\.json$/.test(f));
    expect(saved.length, files.join(", ")).toBe(1);
    expect(
      JSON.parse(await Bun.file(path.join(out, saved[0] as string)).text()),
    ).toStrictEqual(body);
    for (const f of files) {
      const text = await Bun.file(path.join(out, f)).text();
      expect(!text.includes("SECRET"), `${f} holds a credential`).toBeTruthy();
      expect(
        !text.includes("session=private"),
        `${f} holds a header`,
      ).toBeTruthy();
    }
  } finally {
    child.kill();
    up.server.stop();
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
    expect(res.status).toBe(200);
    expect((up.seen[0] as Seen).url).toBe("/v1/other");
    expect(JSON.parse((up.seen[0] as Seen).body)).toStrictEqual(body);
    expect(
      fs.readdirSync(out).filter((f) => f.startsWith("request-")),
    ).toStrictEqual([]);
  } finally {
    child.kill();
    up.server.stop();
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
  // Each index below is a part of `request`, in the order that `parts` returns.
  const at = (i: number) => list[i] as Part;
  expect(list.map((p) => [p.kind, p.name])).toStrictEqual([
    ["system", "text: first"],
    ["system", "text: second"],
    ["tool", "Bash"],
    ["tool (deferred)", "Later"],
    ["message 0 (user)", "text: one"],
    ["message 0 (user)", "text: two"],
  ]);
  // `without` returns the request with one part removed and the rest intact.
  expect(at(1).without().system).toStrictEqual([item(request.system, 0)]);
  expect(at(2).without().tools).toStrictEqual([item(request.tools, 1)]);
  const msgs = (b: Body) => b.messages;
  const first = item(request.messages, 0).content as Block[];
  expect(item(msgs(at(4).without()), 0).content).toStrictEqual([
    item(first, 1),
  ]);
  expect(msgs(at(4).without())[1]).toStrictEqual(request.messages[1]);
});

test("a long text block splits by section, and the only block of a message stays", () => {
  const filler = "x".repeat(1200);
  const text = `intro\n${filler}\n# Part A\n${filler}\n# Part B\nend`;
  const request = {
    model: "m",
    messages: [{ role: "user", content: [{ type: "text", text }] }],
  };
  const list = parts(request);
  expect(list.length).toBe(3);
  expect(list.map((p) => (p.name as string).replace(/x+/, "x"))).toStrictEqual([
    "section: intro x",
    "section: # Part A x",
    "section: # Part B end",
  ]);
  expect(list.map((p) => p.chars)).toStrictEqual([
    `intro\n${filler}`.length,
    `# Part A\n${filler}`.length,
    "# Part B\nend".length,
  ]);
  const first = item((list[1] as Part).without().messages, 0) as Message;
  const rest = item(first.content as Block[], 0).text;
  expect(rest).toBe(`intro\n${filler}\n# Part B\nend`);
});

test("the upstream is the flag, then `ANTHROPIC_BASE_URL`, then the Anthropic API", () => {
  const port = 8787;
  expect(
    resolveUpstream({ flag: "http://a.test/", baseUrl: "http://b.test", port }),
  ).toBe("http://a.test");
  expect(resolveUpstream({ baseUrl: "http://b.test", port })).toBe(
    "http://b.test",
  );
  expect(resolveUpstream({ port })).toBe("https://api.anthropic.com");
});

test("an upstream that is the address of the proxy is refused", () => {
  for (const url of [
    "http://127.0.0.1:8787",
    "http://localhost:8787/",
    "http://[::1]:8787",
  ]) {
    expect(() => resolveUpstream({ baseUrl: url, port: 8787 })).toThrow(/loop/);
    expect(() => resolveUpstream({ flag: url, port: 8787 })).toThrow(/loop/);
  }
  // Another port on the same host is a real upstream.
  expect(
    resolveUpstream({ baseUrl: "http://127.0.0.1:9000", port: 8787 }),
  ).toBe("http://127.0.0.1:9000");
});

test("the proxy stops with an error when `ANTHROPIC_BASE_URL` is its own address", async () => {
  const port = await freePort();
  const out = tmpDir("capture");
  const r = Bun.spawnSync(
    [
      process.execPath,
      "--no-env-file",
      TOOL,
      "--port",
      String(port),
      "--out",
      out,
    ],
    {
      env: { ...process.env, ANTHROPIC_BASE_URL: `http://127.0.0.1:${port}` },
    },
  );
  expect(r.exitCode).toBe(1);
});
