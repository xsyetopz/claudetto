#!/usr/bin/env bash
# Scaffold: `fetchUsr` is referenced in 6 files of 11 under src/. Five hold the name: a call, an
# import alias, two re-exports, a JSDoc link and an export alias (`fetchUsrV1`, a public name that
# stays). The sixth, src/registry.ts, never spells it: it builds `fetch` + "Usr" at run time, no
# test covers that loader, and `bun src/lookup.ts usr 7` prints "unknown kind: usr" once the api is
# renamed and the registry is not. The comment in src/api.ts and the README both name three
# callers. `fetchUsrs`, `prefetchUsr`, `FETCHUSR_TIMEOUT_MS`, the parameter in src/retry.ts and the
# wire names in src/events.ts (pinned by fixtures/analytics-contract.json and a test) are other
# things and must stay. Offline and deterministic.
set -euo pipefail
mkdir -p src fixtures
cat > package.json <<'JSON'
{ "name": "tiny-users", "private": true, "type": "module", "scripts": { "test": "bun test" } }
JSON
cat > README.md <<'MD'
# tiny-users

- `bun test` runs the tests.
- `bun src/lookup.ts <kind> <id>` prints one record.
- `bun src/cli.ts <id>` prints one user.

The single-user loader in `src/api.ts` has three callers: `page.ts`, `cli.ts` and `index.ts`.
MD
cat > src/api.ts <<'TS'
// Used by page.ts, cli.ts and index.ts.
export async function fetchUsr(id: string): Promise<string> {
	return `user:${id}`;
}
export async function fetchOrg(id: string): Promise<string> {
	return `org:${id}`;
}
export const fetchUsrs = (ids: string[]) => ids.map((id) => `user:${id}`);
export function prefetchUsr(id: string): void {
	void fetchUsr(id);
}
export const FETCHUSR_TIMEOUT_MS = 5000;
export { fetchUsr as fetchUsrV1 };
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

const KINDS = { usr: "Usr", org: "Org" } as const;
const exported: Record<string, unknown> = api;

export const loaders: Record<string, Loader | undefined> = Object.fromEntries(
	Object.entries(KINDS).map(([kind, suffix]) => [kind, exported[`fetch${suffix}`] as Loader | undefined])
);
TS
cat > src/lookup.ts <<'TS'
import { loaders } from "./registry";

const [kind = "usr", id = "0"] = process.argv.slice(2);
const load = loaders[kind];
console.log(load ? await load(id) : `unknown kind: ${kind}`);
TS
cat > src/retry.ts <<'TS'
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
export const EVENT_NAMES = ["fetchUsr.started", "fetchUsr.done"] as const;
TS
cat > fixtures/analytics-contract.json <<'JSON'
{ "events": ["fetchUsr.started", "fetchUsr.done"] }
JSON
cat > src/events.test.ts <<'TS'
import { expect, test } from "bun:test";
import contract from "../fixtures/analytics-contract.json";
import { EVENT_NAMES } from "./events";

test("the event names match the analytics contract", () => {
	expect([...EVENT_NAMES]).toEqual(contract.events);
});
TS
cat > src/api.test.ts <<'TS'
import { expect, test } from "bun:test";
import * as api from "./api";
import { fetchUsr, fetchUsrs } from "./api";
import { loaders } from "./registry";

test("returns one user", async () => {
	expect(await fetchUsr("7")).toBe("user:7");
});

test("maps ids to users", () => {
	expect(fetchUsrs(["1", "2"])).toEqual(["user:1", "user:2"]);
});

test("the api exports exactly these names", () => {
	expect(Object.keys(api).sort()).toEqual([
		"FETCHUSR_TIMEOUT_MS",
		"fetchOrg",
		"fetchUsr",
		"fetchUsrV1",
		"fetchUsrs",
		"prefetchUsr"
	]);
});

test("the registry loads one org", async () => {
	expect(await loaders.org?.("3")).toBe("org:3");
});
TS
git init -q -b main
git add -A
git -c user.name=eval -c user.email=eval@example.invalid commit -q -m "chore: initial users"
