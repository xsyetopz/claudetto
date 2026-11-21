#!/usr/bin/env bash
# Scaffold: three files that use fetchUsr, plus a decoy name that must stay. Offline, deterministic.
set -euo pipefail
mkdir -p src
cat > src/api.ts <<'TS'
export async function fetchUsr(id: string): Promise<string> {
	return `user:${id}`;
}

export const fetchUsrs = (ids: string[]) => ids.map((id) => `user:${id}`);
TS
cat > src/page.ts <<'TS'
import { fetchUsr } from "./api";

export async function render(id: string): Promise<string> {
	return `<h1>${await fetchUsr(id)}</h1>`;
}
TS
cat > src/cli.ts <<'TS'
import { fetchUsr } from "./api";

console.log(await fetchUsr(process.argv[2] ?? "0"));
TS
