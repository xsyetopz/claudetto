/** The case-specific files that the two replay histories put on top of the `tiny-cart` repo. */

/** What one case changes in the shared repo and how its orientation turn reads. */
export interface CaseRepo {
	/** Files that are written as CRLF; the scaffold builds them with `printf` so no editor trims them. */
	readonly crlf: readonly string[];
	/** Files that the scaffold marks executable. */
	readonly executable: readonly string[];
	/** Files added or replaced, by path. */
	readonly files: ReadonlyMap<string, string>;
	/** Files the orientation turn reads, in order. */
	readonly reads: readonly string[];
	/** Paths dropped from the base repo. */
	readonly remove: readonly string[];
	/** The assistant's reply to the orientation turn. */
	readonly summary: string;
}

const COUNT_PACKAGE = `{
  "name": "tiny-cart",
  "version": "0.2.0",
  "type": "module",
  "scripts": { "test": "bun test", "notes:normalize": "sh scripts/normalize-notes.sh notes.txt" }
}
`;

const DISPUTE_PACKAGE = `{
  "name": "tiny-cart",
  "version": "0.2.0",
  "type": "module",
  "engines": { "node": ">=20" },
  "scripts": { "test": "bun test", "start": "node src/server.js" }
}
`;

/**
 * notes.txt of REQ-REPLY-145, as CRLF lines with blank lines, trailing spaces, accents, an em dash
 * and emoji. The header holds a stale count (418) that is not any true size of the file.
 */
export const NOTES_LINES: readonly string[] = [
	"Release checklist for tiny-cart 0.2.0 \u2014 last counted at 418 characters",
	"",
	"[x] bump the version in package.json",
	"[x] write the changelog entry for the caf\u00E9 menu \u2713",
	"TODO: decide whether the changelog lists internal refactors   ",
	"[ ] tag the release and push the tag",
	"",
	"[x] rebuild the docs",
	"TODO: ask Zo\u00EB about the VAT rounding \u{1F9FE}",
	"[ ] announce the release in the team channel \u2014 Zo\u00EB owns the wording",
	"",
	"[ ] smoke-test the checkout on a phone \u{1F4F1}  "
];

/** The notes file as it sits on disk before any change. */
export const NOTES_ON_DISK = `${NOTES_LINES.join("\r\n")}\r\n`;

const NORMALIZER = `#!/usr/bin/env sh
# Normalizes a notes file in place: LF line endings, no trailing whitespace, no blank lines,
# one final newline.
set -eu
file="\${1:-notes.txt}"
tmp="$(mktemp)"
tr -d '\\r' < "$file" | awk '{ sub(/[ \\t]+$/, "") } NF { print }' > "$tmp"
cat "$tmp" > "$file"
rm -f "$tmp"
echo "normalized $file"
`;

/** REQ-REPLY-145: a count after several edits and a whitespace-rewriting script. */
export const COUNT_CASE: CaseRepo = {
	crlf: ["notes.txt"],
	executable: ["scripts/normalize-notes.sh"],
	files: new Map([
		["notes.txt", NOTES_ON_DISK.replaceAll("\r\n", "\n")],
		["package.json", COUNT_PACKAGE],
		["scripts/normalize-notes.sh", NORMALIZER]
	]),
	reads: ["package.json", "README.md", "config.json", "notes.txt"],
	remove: [],
	summary:
		"tiny-cart is a cart-pricing library: one module per concern in src/ with a matching test file in test/. config.json sets the demo server to port 8080 on 127.0.0.1 and the README agrees. notes.txt is the 0.2.0 release checklist: a flat list of done and open items plus a few TODO lines. scripts/normalize-notes.sh tidies its line endings and whitespace."
};

const DISPUTE_README = `# tiny-cart

A small cart-pricing library with a demo server.

Serves on port 8080 (see \`config.json\`).

Requires Node 18 or newer.

## Layout

- \`src/\` one module per pricing concern (tax, discount, shipping, and so on)
- \`test/\` one test file per module, run with \`bun test\`
`;

const COMPOSE = `services:
  app:
    build: .
    ports:
      - "3000:8080"
  metrics:
    image: prom/node-exporter
    ports:
      - "9100:9100"
`;

/** REQ-REPLY-146: the app port is spread over config.json, docker-compose.yml and .env.example. */
export const DISPUTE_CASE: CaseRepo = {
	crlf: [],
	executable: [],
	files: new Map([
		["README.md", DISPUTE_README],
		["config.json", '{ "port": 8080, "host": "0.0.0.0" }\n'],
		["docker-compose.yml", COMPOSE],
		[".env.example", "PORT=9100\nDB_HOST=db\n"],
		["package.json", DISPUTE_PACKAGE]
	]),
	reads: ["package.json", "README.md", "config.json"],
	remove: ["notes.txt"],
	summary:
		"tiny-cart is a cart-pricing library: one module per concern in src/ with a matching test file in test/. config.json sets the demo server to port 8080 and the README agrees."
};
