import { describe, expect, test } from "claude-code/testing";

import { fillSettings } from "../../../settings/defaults";
import { isRecord } from "../../../settings/settings";
import { wallRule } from "../rules";

interface Filled {
	attribution: { commit: string };
	permissions: { ask: string[]; deny: string[] };
	sandbox: {
		enabled: boolean;
		excludedCommands: string[];
		filesystem: {
			allowWrite: string[];
			denyRead: string[];
			denyWrite: string[];
		};
		network: { allowMachLookup: string[] };
	};
}

const isFilled = (value: unknown): value is Filled => isRecord(value);

const parsed = (text: string | undefined): Filled => {
	const value: unknown = JSON.parse(text ?? "");
	if (!isFilled(value)) {
		throw new Error("settings text is not a JSON object");
	}
	return value;
};

const fillOf = (text?: string): Filled => parsed(fillSettings(text)?.text);

const fillWalls = (walls: readonly string[]): Filled =>
	parsed(fillSettings(void 0, walls)?.text);

describe("guard rules", () => {
	test("denies env files, credential stores and force pushes while a plain push stays free", () => {
		// Act
		const next = fillOf();

		// Assert
		expect(next.permissions.deny).toEqual(
			expect.arrayContaining([
				"Read(**/.env)",
				"Read(~/.aws/**)",
				"Bash(git push --force*)",
				"Bash(git push -f*)",
				"Bash(git *push* --force*)",
				"Bash(git *push* -f *)",
				"Read(~/.claudetto-holdout/**)"
			])
		);
		expect(next.permissions.deny).not.toContain("Bash(git push*)");
		expect(next.permissions.deny).not.toContain("Read(**/.env.example)");
	});

	test("walls each protected path in Read deny and in both sandbox lists", () => {
		// Act
		const next = fillWalls(["~/.claudetto-holdout", "/srv/holdout"]);

		// Assert
		expect(next.permissions.deny).toContain("Read(//srv/holdout/**)");
		expect(next.sandbox.filesystem.denyRead).toContain("/srv/holdout");
		expect(next.sandbox.filesystem.denyWrite).toContain("/srv/holdout");
		expect(wallRule("$HOME/x")).toBe("~/x");
	});

	test("writes the sandbox lists of REQ-GUARDS-071 and keeps ~/.ssh and ~/.gnupg readable", () => {
		// Act
		const next = fillOf();

		// Assert
		const { filesystem, network, excludedCommands } = next.sandbox;
		expect(filesystem.allowWrite).toEqual(
			expect.arrayContaining(["~/", "/Volumes/", "/private/tmp"])
		);
		expect(filesystem.denyWrite).toEqual(
			expect.arrayContaining([
				"~/.zshrc",
				"~/.bashrc",
				"~/.gitconfig",
				"~/.ssh",
				"~/Library/LaunchAgents",
				"~/.local/bin",
				"~/.claude/hooks"
			])
		);
		expect(filesystem.denyRead).toEqual(
			expect.arrayContaining([
				"~/Library/Keychains",
				"~/.aws",
				"~/.azure",
				"~/.config/gcloud",
				"~/.netrc",
				"~/.git-credentials"
			])
		);
		expect(filesystem.denyRead).not.toContain("~/.ssh");
		expect(filesystem.denyRead).not.toContain("~/.gnupg");
		expect(network.allowMachLookup).toEqual(["*"]);
		expect(excludedCommands).toEqual(
			expect.arrayContaining(["ps *", "top *", "sysctl *", "launchctl list"])
		);
	});

	test("writes no wall group for an empty list", () => {
		// Act
		const next = fillWalls([]);

		// Assert
		expect(next.permissions.deny.some((rule) => rule.includes("holdout"))).toBe(
			false
		);
		expect(next.sandbox.filesystem.denyWrite).not.toContain(
			"~/.claudetto-holdout"
		);
	});

	test("turns the sandbox on only when unset and keeps a user's own list entries", () => {
		// Arrange
		const text = JSON.stringify({
			sandbox: { enabled: false, filesystem: { denyWrite: ["/mine"] } }
		});

		// Act
		const next = fillOf(text);

		// Assert
		expect(next.sandbox.enabled).toBe(false);
		expect(next.sandbox.filesystem.denyWrite).toContain("/mine");
		expect(next.sandbox.filesystem.denyWrite).toContain("~/.zshrc");
	});

	test("asks before stash writes, tag pushes and process kills, and lets git stash list run", () => {
		// Act
		const next = fillOf();

		// Assert
		expect(next.permissions.ask).not.toContain("Bash(git stash*)");
		expect(next.permissions.ask).toEqual(
			expect.arrayContaining([
				"Bash(git stash)",
				"Bash(git stash drop*)",
				"Bash(git * stash pop*)",
				"Bash(pkill *)",
				"Bash(killall *)",
				"Bash(git push --tags*)"
			])
		);
	});

	test("sets one commit trailer that git hosts link to the claude account, and no Signed-off-by line", () => {
		// Act
		const next = fillOf();

		// Assert
		expect(next.attribution.commit).toBe(
			"Co-Authored-By: Claude <noreply@anthropic.com>"
		);
		expect(next.attribution.commit.match(/^[\w-]+:/gmu)).toHaveLength(1);
		expect(JSON.stringify(next)).not.toContain("Signed-off-by");
	});
});
