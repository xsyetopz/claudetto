import { describe, expect, test } from "bun:test";
import { bash, facts } from "../../__tests__/facts-stub.ts";
import type { Facts } from "../../gate.ts";

const ORIGIN = "git@github.com:me/repo.git";

const withRemotes = (urls: readonly string[] | undefined): Facts => ({
	...facts(),
	pushUrls: async () => urls,
});

describe("a push to a host the repository does not name", () => {
	test("a URL that no remote holds is put to a person", async () => {
		const v = await bash(
			"git push https://git.example.invalid/someone/repo.git main",
			withRemotes([ORIGIN]),
		);

		expect(v.decision).toBe("ask");
		expect(v.person).toBe(true);
	});

	test("a URL given with `--repo` is read the same way", async () => {
		const v = await bash(
			"git push --repo=https://git.example.invalid/x.git main",
			withRemotes([ORIGIN]),
		);

		expect(v.person).toBe(true);
	});

	test("an `scp`-style address that no remote holds is put to a person", async () => {
		const v = await bash(
			"git push git@git.example.invalid:x/y.git main",
			withRemotes([ORIGIN]),
		);

		expect(v.person).toBe(true);
	});

	test("a URL is put to a person when the remotes cannot be read", async () => {
		const v = await bash(
			"git push https://git.example.invalid/x.git main",
			withRemotes(undefined),
		);

		expect(v.person).toBe(true);
	});

	test("the URL of a configured remote is allowed", async () => {
		const v = await bash(`git push ${ORIGIN} main`, withRemotes([ORIGIN]));

		expect(v.decision).toBe("allow");
	});

	test.each(["git push origin main", "git push", "git push -u origin x"])(
		"a remote name or a bare push is allowed: `%s`",
		async (command) => {
			expect((await bash(command, withRemotes([ORIGIN]))).decision).toBe(
				"allow",
			);
		},
	);

	test("a force push to a configured remote asks, and a classifier may settle it", async () => {
		const v = await bash(
			"git push --force-with-lease origin feature/typo",
			withRemotes([ORIGIN]),
		);

		expect(v.decision).toBe("ask");
		expect(v.person).toBeUndefined();
	});
});
