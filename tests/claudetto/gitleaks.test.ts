import { expect, test } from "bun:test";
import { join } from "node:path";
import { file as bunFile, CryptoHasher } from "bun";
import {
	gitleaksDropped,
	gitleaksIds,
	gitleaksRedact,
	gitleaksSkipped,
	gitleaksSource,
} from "../../plugins/claudetto/src/shared/secrets/gitleaks/gitleaks.ts";
import { REDACTED } from "../../plugins/claudetto/src/shared/secrets/mask.ts";
import { redact } from "../../plugins/claudetto/src/shared/secrets/redact.ts";
import { translate } from "../../tools/gitleaks/translate.ts";

const ROOT = join(import.meta.dir, "..", "..");

const BODY = "7f3Kq9ZxW2mBvN8cR4tY6uH1jP5sD0gL3aEzQkMnBvCxZaSdFgHjKl";

const LINEAR = `lin_api_${BODY.slice(0, 40)}`;

const SONAR = "sqp_7f3kq9zxw2mbvn8cr4ty6uh1jp5sd0gl3ae0";

test("a vendor key the program table does not name is redacted", () => {
	expect(redact(`Set LINEAR_KEY=${LINEAR} in the env.`)).toBe(
		`Set LINEAR_KEY=${REDACTED} in the env.`,
	);
});

test("a rule that names a secret group masks the group and keeps the name", () => {
	expect(gitleaksRedact(`sonar.token=${SONAR}`)).toBe(
		`sonar.token=${REDACTED}`,
	);
});

// A mask of the UUID chunk alone would leave the webhook URL working.
test("a rule whose group repeats masks the whole match and leaves no working URL", () => {
	const url =
		"https://acme7x2q.webhook.office.com/webhookb2/8f3a9c1d-4b2e-9f7a-8c3d-1e2f3a4b5c6d@7a1b2c3d-9e8f-7a6b-5c4d-3e2f1a0b9c8d/IncomingWebhook/9f8e7d6c5b4a39281706f5e4d3c2b1a0/2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e";

	expect(gitleaksRedact(`Post to ${url} on deploy.`)).toBe(
		`Post to ${REDACTED} on deploy.`,
	);
});

test("a rule whose group is the secret keeps the name beside the mask", () => {
	expect(
		gitleaksRedact("lob_api_key = live_7f3kq9zxw2mbvn8cr4ty6uh1jp5sd"),
	).toBe(`lob_api_key = ${REDACTED}`);
});

test("a value below the entropy bound of its rule is kept", () => {
	const text = `lin_api_${"a".repeat(40)}`;

	expect(gitleaksRedact(text)).toBe(text);
});

test("a published sample that the allowlist of its rule names is kept", () => {
	const text = "AKIAIOSFODNN7EXAMPLE";

	expect(gitleaksRedact(text)).toBe(text);
});

test("a key of the same vendor that no allowlist names is redacted", () => {
	expect(gitleaksRedact("AIzaSyB7f3Kq9ZxW2mBvN8cR4tY6uH1jP5sD0gL")).toBe(
		REDACTED,
	);
});

test("a pattern without its keyword in the text never runs", () => {
	const text = "The value 01234567-89ab-cdef-0123-456789abcdef is a run id.";

	expect(gitleaksRedact(text)).toBe(text);
	expect(gitleaksRedact(`heroku_api_key = ${text.slice(10, 46)}`)).toBe(
		`heroku_api_key = ${REDACTED}`,
	);
});

test("prose about keys and tokens is returned unchanged", () => {
	const text = `The handoff writes a context block with the newest plan path, and the token
count stays under the reserve. Rename \`apiKey\` to \`credential\` in \`src/api.ts\`,
then set the secret key of the test fixture from the environment.`;

	expect(gitleaksRedact(text)).toBe(text);
});

test("every rule compiles in the engine that runs the mod", () => {
	gitleaksRedact(`${LINEAR} ${SONAR} AIzaSyB7f3Kq9ZxW2mBvN8cR4tY6uH1jP5sD0gL`);

	expect(gitleaksSkipped()).toEqual([]);
});

test("the rules carry the digest of the config they were generated from", async () => {
	const toml = await bunFile(
		join(ROOT, "docs", "keep", "gitleaks", "gitleaks.toml"),
	).text();

	const source = gitleaksSource();

	expect(source.ref).toBe("v8.30.1");
	expect(source.sha256).toBe(
		new CryptoHasher("sha256").update(toml).digest("hex"),
	);
});

test("the generated rule set is whole, and each rule left out carries its reason", () => {
	const ids = gitleaksIds();
	const dropped = gitleaksDropped();

	expect(ids.length).toBe(216);
	expect(new Set(ids).size).toBe(ids.length);
	expect(dropped.length).toBe(7);
	for (const [id, why] of dropped) {
		expect(id.length).toBeGreaterThan(0);
		expect(why.length).toBeGreaterThan(0);
	}
});

test("an inline flag setter at the head of a pattern becomes a flag", () => {
	expect(translate("(?i)abc")).toEqual({ source: "abc", flags: "i" });
});

test("a setter inside a group holds to the end of that group and no further", () => {
	expect(translate("\\b(p8e-(?i)[a-z]{3})x")).toEqual({
		source: "\\b(p8e-(?i:[a-z]{3}))x",
		flags: "",
	});
});

test("a setter at the top level holds to the end of the pattern", () => {
	expect(translate("^/Users/(?i)[a-z0-9]+$")).toEqual({
		source: "^/Users/(?i:[a-z0-9]+$)",
		flags: "",
	});
});

test("a pattern JavaScript cannot compile is refused rather than returned", () => {
	expect(translate("(?P<name>a)")).toBeUndefined();
});
