import { expect, test } from "bun:test";

import { $ } from "bun";

import { hasSubscriptionLogin, subscriptionEnv } from "./subscription.ts";

const ROOT = `${import.meta.dir}/..`;
const KEY = "ANTHROPIC_API_KEY";
const OWNER = "tools/subscription.ts";
const PAID_LAUNCHERS = ["tools/claim-check-launch.ts"];

test("subscriptionEnv drops the API key and keeps the rest", () => {
	const env = subscriptionEnv({
		[KEY]: "x",
		CLAUDE_CODE_OAUTH_TOKEN: "t",
		PATH: "/bin",
	});
	expect(env).toEqual({ CLAUDE_CODE_OAUTH_TOKEN: "t", PATH: "/bin" });
});

test("a paid run needs the login token, and an API key does not stand in for it", () => {
	expect(hasSubscriptionLogin({ [KEY]: "x" })).toBe(false);
	expect(hasSubscriptionLogin({ CLAUDE_CODE_OAUTH_TOKEN: "" })).toBe(false);
	expect(hasSubscriptionLogin({ CLAUDE_CODE_OAUTH_TOKEN: "t" })).toBe(true);
});

test("no tool or plugin text names the API key", async () => {
	const hits =
		await $`git grep -n -e ${KEY} -- tools plugins ${":!*.test.ts"} ${`:!${OWNER}`}`
			.cwd(ROOT)
			.nothrow()
			.text();
	expect(hits).toBe("");
});

test("each launcher of a paid run builds its environment with subscriptionEnv", async () => {
	const texts = await Promise.all(
		PAID_LAUNCHERS.map((f) => Bun.file(`${ROOT}/${f}`).text()),
	);
	for (const text of texts) {
		expect(text).toContain("subscriptionEnv(");
	}
});
