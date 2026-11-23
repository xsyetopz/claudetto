#!/usr/bin/env bash
# Scaffold: `fetchUsr` is used across 6 files of 8: as a call, an import alias, a re-export, a
# JSDoc link, and a string key into the module. The names `fetchUsrs`, `prefetchUsr` and
# `FETCHUSR_TIMEOUT_MS`, a parameter named `fetchUsr` in src/retry.ts, and the wire names in
# src/events.ts are other things and must stay. Offline and deterministic.
set -euo pipefail
mkdir -p src
cat > package.json <<'JSON'
{ "name": "tiny-users", "private": true, "type": "module", "scripts": { "test": "bun test" } }
JSON
cat > src/api.ts <<'TS'
export async function fetchUsr(id: string): Promise<string> {
	return `user:${id}`;
}
export const fetchUsrs = (ids: string[]) => ids.map((id) => `user:${id}`);
export function prefetchUsr(id: string): void {
	void fetchUsr(id);
}
export const FETCHUSR_TIMEOUT_MS = 5000;
TS
cat > src/index.ts <<'TS'
export { fetchUsr, fetchUsrs, prefetchUsr } from "./api";
export { fetchUsr as loadProfile } from "./api";
TS
cat > src/page.ts <<'TS'
import { fetchUsr } from "./api";
/** Renders the page of one user. See {@link fetchUsr}. */
export async function render(id: string): Promise<string> {
	return `<h1>${await fetchUsr(id)}</h1>`;
}
TS
cat > src/cli.ts <<'TS'
import { fetchUsr as load } from "./api";
console.log(await load(process.argv[2] ?? "0"));
TS
cat > src/registry.ts <<'TS'
import * as api from "./api";
type Loader = (id: string) => Promise<string>;
export const loaders: Record<string, Loader> = {
	usr: api["fetchUsr"],
	usrBatch: async (id) => api.fetchUsrs([id]).join(",")
};
TS
cat > src/retry.ts <<'TS'
// A generic retry helper. Its parameter is any loader the caller passes in, not the api function.
export async function withRetry(fetchUsr: () => Promise<string>, tries = 3): Promise<string> {
	for (let attempt = 1; attempt < tries; attempt++) {
		try {
			return await fetchUsr();
		} catch {
			// try again
		}
	}
	return await fetchUsr();
}
TS
cat > src/events.ts <<'TS'
// Wire names the analytics pipeline matches on. They are not the function and never change.
export const EVENT_NAMES = ["fetchUsr.started", "fetchUsr.done"] as const;
TS
cat > src/api.test.ts <<'TS'
import { expect, test } from "bun:test";
import { fetchUsr, fetchUsrs } from "./api";
import { loaders } from "./registry";

test("returns one user", async () => {
	expect(await fetchUsr("7")).toBe("user:7");
});

test("maps ids to users", () => {
	expect(fetchUsrs(["1", "2"])).toEqual(["user:1", "user:2"]);
});

test("the registry loads one user", async () => {
	expect(await loaders.usr?.("9")).toBe("user:9");
});
TS
git init -q -b main
git add -A
git -c user.name=eval -c user.email=eval@example.invalid commit -q -m "chore: initial users"
