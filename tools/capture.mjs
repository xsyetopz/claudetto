#!/usr/bin/env bun
// A local logging proxy for the requests of Claude Code.
//
//   bun tools/capture.mjs [--port 8787] [--out DIR] [--no-count] [--count FILE]
//   ANTHROPIC_BASE_URL=http://127.0.0.1:8787 ENABLE_TOOL_SEARCH=true claude
//
// It forwards each request to https://api.anthropic.com and writes the body of
// each `/v1/messages` request to DIR (default $TMPDIR/dotclaude-capture).
// It never writes a request header, because the headers carry the credential.
// For the first `/v1/messages` request with tools, it sizes each part with
// the `count_tokens` endpoint: the full request, then the request without one
// tool, one block, or one section of a long text block at a time.
// With `--count FILE`, it sizes FILE instead, with the credential of the first
// request that comes in.
// The difference is the token cost of that part, wrappers included.
// The report goes to DIR/report-<n>.json and to stdout.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { report, UPSTREAM } from "./capture/report.mjs";

// Headers that go upstream unchanged; all others stay behind.
const PASS =
  /^(authorization|x-api-key|anthropic-.*|content-type|user-agent|x-app|x-stainless-.*)$/i;

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(name);
  return i === -1 ? fallback : args[i + 1];
};
const port = Number(flag("--port", 8787));
const out = flag(
  "--out",
  path.join(process.env.TMPDIR || os.tmpdir(), "dotclaude-capture"),
);
const count = !args.includes("--no-count");
const recount = flag("--count", null);
fs.mkdirSync(out, { recursive: true });

// Each run numbers its files from a new stamp, so a run never overwrites another.
const run = new Date().toISOString().replace(/[:.]/g, "-");
let seen = 0;

/** Print an error and keep it in DIR, because the terminal may be gone. */
const fail = (n) => (e) => {
  console.error(String(e));
  fs.writeFileSync(path.join(out, `error-${n}.txt`), `${e?.stack ?? e}\n`);
};
let counted = false;

const passHeaders = (headers) => {
  const kept = new Headers();
  for (const [name, value] of headers)
    if (PASS.test(name)) kept.set(name, value);
  return kept;
};

Bun.serve({
  hostname: "127.0.0.1",
  port,
  idleTimeout: 0,
  async fetch(req) {
    const url = new URL(req.url);
    const headers = passHeaders(req.headers);
    const raw =
      req.method === "GET" || req.method === "HEAD"
        ? undefined
        : await req.arrayBuffer();
    if (recount && !counted && raw) {
      counted = true;
      const body = JSON.parse(fs.readFileSync(recount, "utf8"));
      report(
        out,
        `${run}-file`,
        body,
        passHeaders(req.headers),
        url.search,
      ).catch(fail(`${run}-file`));
    }
    if (url.pathname === "/v1/messages" && raw) {
      const n = `${run}-${++seen}`;
      const body = JSON.parse(new TextDecoder().decode(raw));
      fs.writeFileSync(
        path.join(out, `request-${n}.json`),
        `${JSON.stringify(body, null, 2)}\n`,
      );
      console.log(
        `request ${n}: ${body.model}, ${raw.byteLength} bytes, saved`,
      );
      // The main loop sends the first request with tools.
      if (count && !counted && body.tools?.length) {
        counted = true;
        report(out, n, body, passHeaders(req.headers), url.search).catch(
          fail(n),
        );
      }
    }
    const res = await fetch(`${UPSTREAM}${url.pathname}${url.search}`, {
      method: req.method,
      headers,
      body: raw,
    });
    // fetch decodes the body, so the encoding and length headers no longer apply.
    const back = new Headers(res.headers);
    back.delete("content-encoding");
    back.delete("content-length");
    return new Response(res.body, { status: res.status, headers: back });
  },
});

console.log(
  `capture: http://127.0.0.1:${port} -> ${UPSTREAM}, bodies in ${out}`,
);
