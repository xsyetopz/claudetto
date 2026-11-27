#!/usr/bin/env bash
# Scaffold: one parser and one caller, so the answer names a function and two files. Offline and deterministic.
set -euo pipefail

mkdir -p src
cat > src/url.ts <<'TS'
/** Splits a URL into scheme and rest; null when the input has no `://`. */
export function parseUrl(input: string): { scheme: string; rest: string } | null {
	const at = input.indexOf("://");
	return at === -1 ? null : { scheme: input.slice(0, at), rest: input.slice(at + 3) };
}
TS
cat > src/fetcher.ts <<'TS'
import { parseUrl } from "./url";

export const schemeOf = (input: string): string => parseUrl(input)?.scheme ?? "https";
TS
