import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import { bareRepo } from "./facts.ts";

const URL = "https://git.example.invalid/me/repo.git";

const REMOTES = `origin\t${URL} (fetch)
origin\t${URL} (push)
mirror\thttps://fetch.example.invalid/x.git (fetch)
mirror\tgit@push.example.invalid:me/x.git (push)
`;

const checked = ($: Engine, on: On, command: string) => {
	bareRepo(on, REMOTES);
	on("session.cwd", () => ({ value: "/repo" }));
	on("env.get", () => ({ value: undefined }));
	on("tool.check", () => ({ decision: "allow" }));
	return $.tool.check({ tool: "Bash", input: { command } });
};

test("a push to the URL of a remote is allowed", async ($: Engine, on: On) => {
	expect((await checked($, on, `git push ${URL} main`)).decision).toBe("allow");
});

test("a push to a remote's push URL is allowed", async ($: Engine, on: On) => {
	const out = await checked(
		$,
		on,
		"git push git@push.example.invalid:me/x.git",
	);

	expect(out.decision).toBe("allow");
});

test("a push to a URL a remote only fetches from asks", async ($: Engine, on: On) => {
	const out = await checked(
		$,
		on,
		"git push https://fetch.example.invalid/x.git",
	);

	expect(out.decision).toBe("ask");
	expect(out.reason).toContain("fetch.example.invalid");
});
