import { describe, expect, test } from "claude-code/testing";

import { fillSettings } from "../../../settings/defaults";
import { isRecord } from "../../../settings/settings";
import { matchesPattern } from "../conflicts";
import { ASK, DENY, FREE, GUARDED, wallRule } from "../rules";

interface Filled {
	attribution: { commit: string };
	permissions: { allow: string[]; ask: string[]; deny: string[] };
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

	test("turns the sandbox on over a user's false and keeps a user's own list entries", () => {
		// Arrange
		const text = JSON.stringify({
			sandbox: { enabled: false, filesystem: { denyWrite: ["/mine"] } }
		});

		// Act
		const next = fillOf(text);

		// Assert
		expect(next.sandbox.enabled).toBe(true);
		expect(next.sandbox.filesystem.denyWrite).toContain("/mine");
		expect(next.sandbox.filesystem.denyWrite).toContain("~/.zshrc");
	});

	test("asks before the stash list is cleared, tag pushes and process kills, and lets stash saves and reads run", () => {
		// Act
		const next = fillOf();

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
				"Bash(git * stash clear*)",
				"Bash(pkill *)",
				"Bash(killall *)",
				"Bash(git push --tags*)"
			])
		);
	});

	test("removes a stash ask rule an earlier release wrote and keeps an unrelated user ask", () => {
		// Arrange
		const text = JSON.stringify({
			permissions: {
				ask: ["Bash(git stash*)", "Bash(git * stash*)", "Bash(npm publish*)"]
			}
		});

		// Act
		const fill = fillSettings(text);
		const next = fillOf(text);

		// Assert
		expect(next.permissions.ask).not.toContain("Bash(git stash*)");
		expect(next.permissions.ask).not.toContain("Bash(git * stash*)");
		expect(next.permissions.ask).toContain("Bash(npm publish*)");
		expect(next.permissions.ask).toContain("Bash(git stash clear*)");
		expect(next.permissions.ask).not.toContain("Bash(git stash drop*)");
		expect(next.permissions.ask).not.toContain("Bash(git stash pop*)");
		expect(fill?.added).toContain("removed permissions.ask Bash(git stash*)");
	});

	test("removes a deny rule that blocks a free push and an allow that lets a paid run start", () => {
		// Arrange
		const text = JSON.stringify({
			permissions: {
				deny: ["Bash(git push*)", "Bash(rm -rf /*)"],
				allow: ["Bash(claude -p *)", "Bash(ls *)"]
			}
		});

		// Act
		const next = fillOf(text);

		// Assert
		expect(next.permissions.deny).not.toContain("Bash(git push*)");
		expect(next.permissions.deny).toContain("Bash(rm -rf /*)");
		expect(next.permissions.allow).not.toContain("Bash(claude -p *)");
		expect(next.permissions.allow).toContain("Bash(ls *)");
	});

	test("removes a Write ask or deny rule whose Edit twin is in the same list and keeps a lone Write rule", () => {
		// Arrange
		const text = JSON.stringify({
			permissions: {
				ask: ["Write(~/.claude/settings.json)", "Write(~/notes.md)"],
				deny: ["Edit(/etc/hosts)", "Write(/etc/hosts)"]
			}
		});

		// Act
		const fill = fillSettings(text);
		const next = fillOf(text);

		// Assert
		expect(next.permissions.ask).toContain("Edit(~/.claude/settings.json)");
		expect(next.permissions.ask).not.toContain(
			"Write(~/.claude/settings.json)"
		);
		expect(next.permissions.ask).toContain("Write(~/notes.md)");
		expect(next.permissions.deny).toContain("Edit(/etc/hosts)");
		expect(next.permissions.deny).not.toContain("Write(/etc/hosts)");
		expect(fill?.added).toContain(
			"removed permissions.ask Write(~/.claude/settings.json)"
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

describe("rule patterns", () => {
	test("a star matches any run, an escaped star is literal, and no other wildcard exists", () => {
		// Act and Assert
		expect(matchesPattern("git stash*", "git stash list")).toBe(true);
		expect(matchesPattern("git * stash*", "git stash")).toBe(false);
		expect(matchesPattern("git * stash*", "git -C r stash x")).toBe(true);
		expect(matchesPattern(String.raw`echo \*`, "echo *")).toBe(true);
		expect(matchesPattern(String.raw`echo \*`, "echo hi")).toBe(false);
		expect(matchesPattern("ls ?", "ls a")).toBe(false);
		expect(matchesPattern("ls [ab]", "ls a")).toBe(false);
		expect(matchesPattern("a.c", "abc")).toBe(false);
	});

	test("a trailing space and star also match the bare command, and :* is a prefix", () => {
		// Act and Assert
		expect(matchesPattern("git clean *", "git clean")).toBe(true);
		expect(matchesPattern("git push:*", "git push origin")).toBe(true);
	});
});

describe("free and guarded probes", () => {
	const rules = [...ASK, ...DENY].flatMap((rule) => {
		const pattern = /^Bash\((.+)\)$/su.exec(rule)?.[1];
		return pattern === undefined ? [] : [{ rule, pattern }];
	});

	test("no free command matches a rule the construction keeps", () => {
		// Act
		const hits = FREE.flatMap((probe) =>
			rules
				.filter(({ pattern }) => matchesPattern(pattern, probe.command))
				.map(({ rule }) => `${probe.command} -> ${rule}`)
		);

		// Assert
		expect(hits).toEqual([]);
	});

	test("every Bash ask and deny rule matches a guarded command", () => {
		// Act
		const unmatched = rules.filter(
			({ pattern }) =>
				!GUARDED.some((probe) => matchesPattern(pattern, probe.command))
		);

		// Assert
		expect(unmatched).toEqual([]);
	});

	test("every probe states its reason", () => {
		// Act and Assert
		for (const probe of [...FREE, ...GUARDED]) {
			expect(probe.why.length).toBeGreaterThan(0);
		}
	});
});
