import { describe, expect, test } from "claude-code/testing";

import { fillSettings } from "../../../settings/defaults";
import { wallRule } from "../rules";

const fillOf = (text: string | undefined, walls?: readonly string[]) => JSON.parse(fillSettings(text, walls)?.text ?? "");

describe("guard rules", () => {
	test("denies env files, credential stores and force pushes while a plain push stays free", () => {
		// Act
		const next = fillOf(undefined);

		// Assert
		expect(next.permissions.deny).toEqual(
			expect.arrayContaining([
				"Read(**/.env)",
				"Read(~/.aws/**)",
				"Bash(git push --force*)",
				"Bash(git push -f*)",
				"Bash(git *push* --force*)",
				"Bash(git *push* -f *)",
				"Read(~/.claudetto-holdout/**)",
			]),
		);
		expect(next.permissions.deny).not.toContain("Bash(git push*)");
		expect(next.permissions.deny).not.toContain("Read(**/.env.example)");
	});

	test("walls each protected path in Read deny and in both sandbox lists", () => {
		// Act
		const next = fillOf(undefined, ["~/.claudetto-holdout", "/srv/holdout"]);

		// Assert
		expect(next.permissions.deny).toContain("Read(//srv/holdout/**)");
		expect(next.sandbox.filesystem.denyRead).toContain("/srv/holdout");
		expect(next.sandbox.filesystem.denyWrite).toContain("/srv/holdout");
		expect(wallRule("$HOME/x")).toBe("~/x");
	});

	test("writes the sandbox lists of REQ-GUARDS-071 and keeps ~/.ssh and ~/.gnupg readable", () => {
		// Act
		const next = fillOf(undefined);

		// Assert
		const { filesystem, network, excludedCommands } = next.sandbox;
		expect(filesystem.allowWrite).toEqual(expect.arrayContaining(["~/", "/Volumes/", "/private/tmp"]));
		expect(filesystem.denyWrite).toEqual(expect.arrayContaining(["~/.zshrc", "~/.bashrc", "~/.gitconfig", "~/.ssh", "~/Library/LaunchAgents", "~/.local/bin", "~/.claude/hooks"]));
		expect(filesystem.denyRead).toEqual(expect.arrayContaining(["~/Library/Keychains", "~/.aws", "~/.azure", "~/.config/gcloud", "~/.netrc", "~/.git-credentials"]));
		expect(filesystem.denyRead).not.toContain("~/.ssh");
		expect(filesystem.denyRead).not.toContain("~/.gnupg");
		expect(network.allowMachLookup).toEqual(["*"]);
		expect(excludedCommands).toEqual(expect.arrayContaining(["ps *", "top *", "sysctl *", "launchctl list"]));
	});

	test("writes no wall group for an empty list", () => {
		// Act
		const next = fillOf(undefined, []);

		// Assert
		expect(next.permissions.deny.some((rule: string) => rule.includes("holdout"))).toBe(false);
		expect(next.sandbox.filesystem.denyWrite).not.toContain("~/.claudetto-holdout");
	});

	test("turns the sandbox on only when unset and keeps a user's own list entries", () => {
		// Arrange
		const text = JSON.stringify({ sandbox: { enabled: false, filesystem: { denyWrite: ["/mine"] } } });

		// Act
		const next = fillOf(text);

		// Assert
		expect(next.sandbox.enabled).toBe(false);
		expect(next.sandbox.filesystem.denyWrite).toContain("/mine");
		expect(next.sandbox.filesystem.denyWrite).toContain("~/.zshrc");
	});

	test("asks before stash, tag pushes and process kills", () => {
		// Act
		const next = fillOf(undefined);

		// Assert
		expect(next.permissions.ask).toEqual(
			expect.arrayContaining(["Bash(git stash*)", "Bash(git * stash*)", "Bash(pkill *)", "Bash(killall *)", "Bash(git push --tags*)"]),
		);
	});

	test("sets one Assisted-by trailer and no Co-Authored-By or Signed-off-by line", () => {
		// Act
		const next = fillOf(undefined);

		// Assert
		expect(next.attribution.commit).toBe("Assisted-by: Claude Code");
		expect(JSON.stringify(next)).not.toContain("Co-Authored-By");
		expect(JSON.stringify(next)).not.toContain("Signed-off-by");
		expect(next.attribution.commit.match(/Assisted-by/gu)).toHaveLength(1);
	});
});
