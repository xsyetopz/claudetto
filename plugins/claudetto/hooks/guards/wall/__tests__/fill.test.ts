import type { On } from "claude-code";
import { describe, type Engine, expect, test } from "claude-code/testing";

import { isRecord } from "../../../settings/settings";

interface Filled {
	attribution: { commit: string };
	permissions: { allow: string[]; ask: string[]; deny: string[] };
	sandbox: {
		enabled: boolean;
		filesystem: {
			allowWrite: string[];
			denyRead: string[];
			denyWrite: string[];
		};
	};
}

const isFilled = (value: unknown): value is Filled => isRecord(value);

/** Serves a user settings file to a session start and keeps what the plugin writes back to it. */
const serve = (on: On, initial: string | undefined) => {
	const file = { text: initial };
	const store = new Map<string, unknown>();
	on("session.start", (_$, e) => ({ cwd: e.cwd }));
	on("tool.register", (_$, e) => ({ value: { tool: e.name } }));
	on("env.get", (_$, e) => ({
		value: e.name === "HOME" ? "/home/u" : undefined
	}));
	on("settings.read", () => ({ value: {} }));
	on("fs.exists", () => ({ value: file.text !== undefined }));
	on("fs.read", () => ({ value: file.text ?? "" }));
	on("fs.write", (_$, e) => {
		file.text = e.text;
		return { value: undefined };
	});
	on("store.get", (_$, e) => ({ value: store.get(e.key) }));
	on("store.set", (_$, e) => {
		store.set(e.key, e.value);
		return { value: undefined };
	});
	on("ui.log", () => ({ value: undefined }));
	on("command.run", () => ({ text: "Reloaded" }));
	return file;
};

const START = {
	cwd: "/home/u/p",
	surface: null,
	isInteractive: true
} as const;

/** The settings a session start leaves in the user's file, from the given starting text. */
const filled = async ($: Engine, on: On, initial?: string): Promise<Filled> => {
	const file = serve(on, initial);
	await $.session.start(START);
	const value: unknown = JSON.parse(file.text ?? "");
	if (!isFilled(value)) {
		throw new Error("settings text is not a JSON object");
	}
	return value;
};

describe("guard rules a session start writes", () => {
	test("env files, credential stores and force pushes are denied while a plain push and .env.example stay free", async ($, on) => {
		// Act
		const next = await filled($, on);

		// Assert
		expect(next.permissions.deny).toEqual(
			expect.arrayContaining([
				"Read(**/.env)",
				"Read(~/.aws/**)",
				"Bash(git push --force*)",
				"Bash(git push -f*)"
			])
		);
		expect(next.permissions.deny).not.toContain("Bash(git push*)");
		expect(next.permissions.deny).not.toContain("Read(**/.env.example)");
	});

	test(
		"each protected path is walled in Read deny and in both sandbox lists",
		{ options: { protectedPaths: ["~/.claudetto-holdout", "/srv/holdout"] } },
		async ($, on) => {
			// Act
			const next = await filled($, on);

			// Assert
			expect(next.permissions.deny).toContain("Read(~/.claudetto-holdout/**)");
			expect(next.permissions.deny).toContain("Read(//srv/holdout/**)");
			expect(next.sandbox.filesystem.denyRead).toContain("/srv/holdout");
			expect(next.sandbox.filesystem.denyWrite).toContain("/srv/holdout");
		}
	);

	test(
		"an empty protected list writes no wall",
		{ options: { protectedPaths: [] } },
		async ($, on) => {
			// Act
			const next = await filled($, on);

			// Assert
			expect(
				next.permissions.deny.some((rule) => rule.includes("holdout"))
			).toBe(false);
			expect(next.sandbox.filesystem.denyWrite).not.toContain(
				"~/.claudetto-holdout"
			);
		}
	);

	test("the sandbox keeps shell startup files and credential stores out of reach and leaves ~/.ssh and ~/.gnupg readable", async ($, on) => {
		// Act
		const next = await filled($, on);

		// Assert
		const { filesystem } = next.sandbox;
		expect(filesystem.allowWrite).toContain("~/");
		expect(filesystem.denyWrite).toEqual(
			expect.arrayContaining(["~/.zshrc", "~/.bashrc", "~/.ssh"])
		);
		expect(filesystem.denyRead).toEqual(
			expect.arrayContaining(["~/Library/Keychains", "~/.aws", "~/.netrc"])
		);
		expect(filesystem.denyRead).not.toContain("~/.ssh");
		expect(filesystem.denyRead).not.toContain("~/.gnupg");
	});

	test("the sandbox is turned on over a user's false and the user's own list entries stay", async ($, on) => {
		// Arrange
		const text = JSON.stringify({
			sandbox: { enabled: false, filesystem: { denyWrite: ["/mine"] } }
		});

		// Act
		const next = await filled($, on, text);

		// Assert
		expect(next.sandbox.enabled).toBe(true);
		expect(next.sandbox.filesystem.denyWrite).toContain("/mine");
		expect(next.sandbox.filesystem.denyWrite).toContain("~/.zshrc");
	});

	test("the stash list clear, tag pushes and process kills ask first, and stash saves and reads run free", async ($, on) => {
		// Act
		const next = await filled($, on);

		// Assert
		for (const free of [
			"Bash(git stash*)",
			"Bash(git stash)",
			"Bash(git stash -*)"
		]) {
			expect(next.permissions.ask).not.toContain(free);
		}
		expect(next.permissions.ask).toEqual(
			expect.arrayContaining([
				"Bash(git stash clear*)",
				"Bash(pkill *)",
				"Bash(killall *)",
				"Bash(git push --tags*)"
			])
		);
	});

	test("a stash ask rule an earlier release wrote is removed and an unrelated user ask stays", async ($, on) => {
		// Arrange
		const text = JSON.stringify({
			permissions: {
				ask: ["Bash(git stash*)", "Bash(git * stash*)", "Bash(npm publish*)"]
			}
		});

		// Act
		const next = await filled($, on, text);

		// Assert
		expect(next.permissions.ask).not.toContain("Bash(git stash*)");
		expect(next.permissions.ask).not.toContain("Bash(git * stash*)");
		expect(next.permissions.ask).toContain("Bash(npm publish*)");
		expect(next.permissions.ask).toContain("Bash(git stash clear*)");
		expect(next.permissions.ask).not.toContain("Bash(git stash drop*)");
		expect(next.permissions.ask).not.toContain("Bash(git stash pop*)");
	});

	test("a deny rule that blocks a free push and an allow that lets a paid run start are removed", async ($, on) => {
		// Arrange
		const text = JSON.stringify({
			permissions: {
				deny: ["Bash(git push*)", "Bash(rm -rf /*)"],
				allow: ["Bash(claude -p *)", "Bash(ls *)"]
			}
		});

		// Act
		const next = await filled($, on, text);

		// Assert
		expect(next.permissions.deny).not.toContain("Bash(git push*)");
		expect(next.permissions.deny).toContain("Bash(rm -rf /*)");
		expect(next.permissions.allow).not.toContain("Bash(claude -p *)");
		expect(next.permissions.allow).toContain("Bash(ls *)");
	});

	test("a Write rule whose Edit twin is in the same list is removed and a lone Write rule stays", async ($, on) => {
		// Arrange
		const text = JSON.stringify({
			permissions: {
				ask: ["Write(~/.claude/settings.json)", "Write(~/notes.md)"],
				deny: ["Edit(/etc/hosts)", "Write(/etc/hosts)"]
			}
		});

		// Act
		const next = await filled($, on, text);

		// Assert
		expect(next.permissions.ask).toContain("Edit(~/.claude/settings.json)");
		expect(next.permissions.ask).not.toContain(
			"Write(~/.claude/settings.json)"
		);
		expect(next.permissions.ask).toContain("Write(~/notes.md)");
		expect(next.permissions.deny).toContain("Edit(/etc/hosts)");
		expect(next.permissions.deny).not.toContain("Write(/etc/hosts)");
	});

	test("one commit trailer that git hosts link to the claude account is set, and no Signed-off-by line", async ($, on) => {
		// Act
		const next = await filled($, on);

		// Assert
		expect(next.attribution.commit).toContain("Co-Authored-By: Claude");
		expect(next.attribution.commit.match(/^[\w-]+:/gmu)).toHaveLength(1);
		expect(JSON.stringify(next)).not.toContain("Signed-off-by");
	});
});
