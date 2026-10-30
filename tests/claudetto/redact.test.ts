// A handoff crosses a context boundary as a file on disk, so a secret in the session text must not
// reach it. The patterns are transcribed from the installed program, and these cases plant one
// secret of each shape the transcription claims to cover.

import { expect, test } from "bun:test";
import { handoffText, parseTail } from "../../plugins/claudetto/src/handoff.ts";
import { REDACTED } from "../../plugins/claudetto/src/secrets/mask.ts";
import {
	redact,
	redactIds,
} from "../../plugins/claudetto/src/secrets/redact.ts";

/** A key of the `anthropic-api-key` entry: the prefix, 93 of the class, and `AA`. */
const ANTHROPIC = `sk-ant-api03-${"a".repeat(93)}AA`;

/** A token of the `github-pat` entry: the prefix and 36 of the class. */
const GITHUB = `ghp_${"b".repeat(36)}`;

/** A token of the `gitlab-pat` entry, which the program reaches through `displayRun`. */
const GITLAB = `glpat-${"c".repeat(20)}`;

/** A value of the `sensitive-assign` entry, whose name `mt` holds `password`. */
const PASSWORD = "hunter2trustno1";

/** A token of the `loose-jwt` entry: three segments, the first opening `eyJ`. */
const JWT_TOKEN = `eyJ${"a".repeat(12)}.eyJ${"b".repeat(12)}.${"c".repeat(20)}`;

const KEY_BLOCK = `-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEAx7Vn9mKqZ3Qd2sTfLpWbYc8NrGhJvEuDzAiBoXsMlPkRtUwC
-----END RSA PRIVATE KEY-----`;

const turn = (role: string, content: unknown): string =>
	JSON.stringify({ type: role, message: { role, content } });

const said = (role: string, text: string): string =>
	turn(role, [{ type: "text", text }]);

/** A tail begins inside a line, so every fixture carries a broken first line like a real one. */
const tailOf = (...lines: readonly string[]): string =>
	[`e":"text"}]}}`, ...lines].join("\n");

test("an assignment keeps its name and loses its value", () => {
	expect(redact(`PASSWORD=${PASSWORD}`)).toBe(`PASSWORD=${REDACTED}`);
});

test("a quoted assignment keeps its quotes", () => {
	expect(redact(`api_key: "${ANTHROPIC}"`)).toBe(`api_key: "${REDACTED}"`);
});

test("a key with no assignment around it is redacted on its own", () => {
	expect(redact(`The key ${ANTHROPIC} leaked.`)).toBe(
		`The key ${REDACTED} leaked.`,
	);
});

test("a token of a vendor the table names is redacted", () => {
	expect(redact(`${GITHUB} and ${GITLAB}`)).toBe(`${REDACTED} and ${REDACTED}`);
});

test("a private key block goes whole, header and all", () => {
	expect(redact(`before\n${KEY_BLOCK}\nafter`)).toBe(
		`before\n${REDACTED}\nafter`,
	);
});

test("an assignment inside a code span keeps the span closed", () => {
	expect(redact(`Set \`PASSWORD=${PASSWORD}\` first.`)).toBe(
		`Set \`PASSWORD=${REDACTED}\` first.`,
	);
});

test("text with no secret is returned unchanged", () => {
	const text = "Rename `fetchUser` to `getUser` in `src/api.ts`.";

	expect(redact(text)).toBe(text);
});

test("a second pass over redacted text does not mask the mask", () => {
	const once = redact(`PASSWORD=${PASSWORD}`);

	expect(redact(once)).toBe(once);
});

test("a second pass over a redacted code span keeps the span closed", () => {
	const once = redact(`Set \`PASSWORD=${PASSWORD}\` first.`);

	expect(redact(once)).toBe(once);
});

test("the credentials of a URL go and the host stays", () => {
	expect(redact("Cloned https://sam:hunter2@git.example.com/repo.git.")).toBe(
		`Cloned https://${REDACTED}@git.example.com/repo.git.`,
	);
});

test("a web token on its own is redacted", () => {
	expect(redact(`The call carried ${JWT_TOKEN} twice.`)).toBe(
		`The call carried ${REDACTED} twice.`,
	);
});

// The value of `sensitive-assign` takes the scheme word with it, because the program's value part
// lists `Bearer` and `Basic` as an alternative ahead of the plain run.
test("an authorization header loses its scheme and its token", () => {
	expect(redact(`Authorization: Bearer ${JWT_TOKEN}`)).toBe(
		`Authorization: ${REDACTED}`,
	);
});

test("the value of a cloud environment variable is redacted", () => {
	expect(redact("AWS_SESSION_TOKEN=FwoGZXIvYXdzEBYaD")).toBe(
		`AWS_SESSION_TOKEN=${REDACTED}`,
	);
});

test("every row of the table is compiled, none dropped in transcription", () => {
	const ids = redactIds();

	expect(ids).toHaveLength(65);
	expect(ids.slice(0, 2)).toEqual(["url-userinfo", "gcp-service-account"]);
	expect(ids.at(-1)).toBe("shopify-shared-secret");
	expect(new Set(ids).size).toBe(ids.length);
});

test("all eleven GitLab tokens are covered, which the display rules alone would miss", () => {
	const ids = redactIds().filter((id) => id.startsWith("gitlab-"));

	expect(ids).toHaveLength(11);
});

test("the values read from a transcript hold no secret", () => {
	const tail = tailOf(
		said("user", `Deploy with PASSWORD=${PASSWORD} and ${ANTHROPIC}.`),
	);

	const { turns } = parseTail(tail);

	expect(turns).toEqual([
		{
			role: "user",
			text: `Deploy with PASSWORD=${REDACTED} and ${REDACTED}.`,
		},
	]);
});

test("a path that holds a secret is redacted too", () => {
	const tail = tailOf(
		said("user", "Read the token file."),
		turn("assistant", [
			{
				type: "tool_use",
				name: "Read",
				input: { file_path: `/tmp/${GITHUB}/notes.md` },
			},
		]),
	);

	const { paths } = parseTail(tail);

	expect(paths).toEqual([`/tmp/${REDACTED}/notes.md`]);
});

test("the assembled file holds neither the planted key nor the planted password", () => {
	const tail = parseTail(
		tailOf(said("user", `Use ${ANTHROPIC} with PASSWORD=${PASSWORD}.`)),
	);

	const text = handoffText(tail, "2026-10-29T10:00:00.000Z");

	expect(text).not.toContain(ANTHROPIC);
	expect(text).not.toContain(PASSWORD);
});
