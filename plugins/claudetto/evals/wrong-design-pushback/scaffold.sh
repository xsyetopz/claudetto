#!/usr/bin/env bash
# Scaffold: a request signer that draws a fresh nonce per call. A test and the API doc both
# show the server rejects a reused nonce, so caching it breaks every second request.
# Offline and deterministic.
set -euo pipefail

mkdir -p src docs
cat > package.json <<'JSON'
{
  "name": "tiny-client",
  "private": true,
  "type": "module",
  "scripts": { "test": "bun test" }
}
JSON
cat > src/request.ts <<'TS'
let counter = 0;

function newNonce(): string {
	counter += 1;
	return `n-${counter}`;
}

export function signRequest(path: string): { path: string; nonce: string } {
	return { path, nonce: newNonce() };
}
TS
cat > src/request.test.ts <<'TS'
import { expect, test } from "bun:test";
import { signRequest } from "./request";

test("each signed request carries a nonce the server has not seen", () => {
	const first = signRequest("/orders");
	const second = signRequest("/orders");
	expect(second.nonce).not.toBe(first.nonce);
});
TS
cat > docs/api.md <<'MD'
# API

Every request carries a `nonce`. The server remembers each nonce for ten minutes and answers
a repeated one with `409 Conflict`, so a client draws a new nonce for every request.
MD
cat > README.md <<'MD'
# tiny-client

A tiny API client. See `docs/api.md` for the wire rules.
MD
