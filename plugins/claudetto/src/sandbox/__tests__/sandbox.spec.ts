import { describe, expect, test } from "bun:test";
import {
	installedProgram,
	stringsMissing,
} from "../../../../../tools/installed.ts";
import { reopensSecret, sandboxFaults } from "../faults.ts";
import {
	SANDBOX_KEYS,
	SANDBOX_TARGET,
	type SandboxBlock,
	type SandboxSnippet,
	SECRET_PATHS,
	sandboxedCommandDecision,
	sandboxedReadDecision,
	sandboxSnippet,
	sandboxTargetFile,
} from "../sandbox.ts";

const PROGRAM = (await installedProgram()) ?? "";

const MAC = "darwin";

const withSandbox = (
	patch: Partial<SandboxBlock>,
	platform = MAC,
): SandboxSnippet => {
	const base = sandboxSnippet(platform).sandbox;
	return { sandbox: { ...base, ...patch } };
};

const withFilesystem = (
	patch: Partial<SandboxBlock["filesystem"]>,
): SandboxSnippet => {
	const base = sandboxSnippet(MAC).sandbox;
	return {
		sandbox: { ...base, filesystem: { ...base.filesystem, ...patch } },
	};
};

describe("the shipped snippet", () => {
	test("has no fault on macOS and on Linux", () => {
		expect(sandboxFaults(sandboxSnippet("darwin"), "darwin")).toEqual([]);
		expect(sandboxFaults(sandboxSnippet("linux"), "linux")).toEqual([]);
	});

	test("enables the sandbox and sets allowUnsandboxedCommands to false", () => {
		const { sandbox } = sandboxSnippet(MAC);

		expect(sandbox.enabled).toBe(true);
		expect(sandbox.allowUnsandboxedCommands).toBe(false);
	});

	test("leaves out enabled where the platform has no sandbox", () => {
		const snippet = sandboxSnippet("win32");

		expect(snippet.sandbox.enabled).toBeUndefined();
		expect(sandboxFaults(snippet, "win32")).toEqual([]);
	});

	test("goes to the user settings file and to no project or local file", () => {
		const file = sandboxTargetFile("/home/u/.claude");

		expect(SANDBOX_TARGET).toBe("user");
		expect(file).toBe("/home/u/.claude/settings.json");
		expect(file).not.toContain("settings.local.json");
	});

	test("holds the five secret paths in denyRead", () => {
		expect(sandboxSnippet(MAC).sandbox.filesystem.denyRead).toEqual([
			"~/.ssh",
			"~/.gnupg",
			"~/.aws/credentials",
			"~/.netrc",
			"~/.docker/config.json",
		]);
	});

	test("writes no key for the unset rows", () => {
		const { sandbox } = sandboxSnippet(MAC);

		expect(sandbox.autoAllowBashIfSandboxed).toBeUndefined();
		expect(sandbox.excludedCommands).toBeUndefined();
		expect(sandbox.filesystem.allowRead).toBeUndefined();
		expect("failIfUnavailable" in sandbox).toBe(false);
	});
});

describe("the sandbox settles a shell command and denies a secret read", () => {
	test("a sandboxed command is allowed with no prompt", () => {
		expect(sandboxedCommandDecision(sandboxSnippet(MAC), MAC)).toBe("allow");
	});

	test("a command with the sandbox off asks", () => {
		const off = withSandbox({ enabled: false });

		expect(sandboxedCommandDecision(off, MAC)).toBe("ask");
	});

	test("a command on a platform with no sandbox asks", () => {
		expect(sandboxedCommandDecision(sandboxSnippet("win32"), "win32")).toBe(
			"ask",
		);
	});

	for (const secret of SECRET_PATHS) {
		test(`a read of ${secret} is denied`, () => {
			expect(sandboxedReadDecision(sandboxSnippet(MAC), secret)).toBe("denied");
		});
	}

	test("a read of a file under ~/.ssh is denied", () => {
		expect(
			sandboxedReadDecision(sandboxSnippet(MAC), "~/.ssh/id_ed25519"),
		).toBe("denied");
	});

	test("a read of a project file is allowed", () => {
		expect(sandboxedReadDecision(sandboxSnippet(MAC), "~/code/a.ts")).toBe(
			"allowed",
		);
	});

	test("allowRead wins over denyRead", () => {
		const open = withFilesystem({ allowRead: ["~/.ssh"] });

		expect(sandboxedReadDecision(open, "~/.ssh/id_ed25519")).toBe("allowed");
	});
});

describe("sandbox not enabled", () => {
	test("enabled false is named on a supported platform", () => {
		expect(sandboxFaults(withSandbox({ enabled: false }), MAC)).toEqual([
			{ rule: "sandbox-off", where: "sandbox.enabled" },
		]);
	});

	test("enabled absent is named on a supported platform", () => {
		expect(sandboxFaults(sandboxSnippet("win32"), "linux")).toEqual([
			{ rule: "sandbox-off", where: "sandbox.enabled" },
		]);
	});
});

describe("allowUnsandboxedCommands", () => {
	test("true is named", () => {
		const open = withSandbox({ allowUnsandboxedCommands: true });

		expect(sandboxFaults(open, MAC)).toEqual([
			{
				rule: "unsandboxed-allowed",
				where: "sandbox.allowUnsandboxedCommands",
			},
		]);
	});

	test("unset is named, because its default is true", () => {
		const { allowUnsandboxedCommands, ...rest } = sandboxSnippet(MAC).sandbox;
		const unset: SandboxSnippet = { sandbox: rest };

		expect(allowUnsandboxedCommands).toBe(false);

		expect(sandboxFaults(unset, MAC)).toEqual([
			{
				rule: "unsandboxed-allowed",
				where: "sandbox.allowUnsandboxedCommands",
			},
		]);
	});
});

describe("a secret path missing from denyRead", () => {
	for (const secret of SECRET_PATHS) {
		test(`${secret} dropped is named`, () => {
			const dropped = withFilesystem({
				denyRead: SECRET_PATHS.filter((path) => path !== secret),
			});

			expect(sandboxFaults(dropped, MAC)).toEqual([
				{ rule: "deny-read-missing", where: secret },
			]);
		});
	}

	test("an empty denyRead names all five, in order", () => {
		const empty = withFilesystem({ denyRead: [] });

		expect(sandboxFaults(empty, MAC).map((fault) => fault.where)).toEqual([
			...SECRET_PATHS,
		]);
	});

	test("a parent folder covers the path under it", () => {
		const parent = withFilesystem({
			denyRead: ["~/.ssh", "~/.gnupg", "~/.aws", "~/.netrc", "~/.docker"],
		});

		expect(sandboxFaults(parent, MAC)).toEqual([]);
	});

	test("a glob form of an entry covers it", () => {
		const glob = withFilesystem({
			denyRead: [
				"~/.ssh/**",
				"~/.gnupg/**",
				"~/.aws/credentials",
				"~/.netrc",
				"~/.docker/config.json",
			],
		});

		expect(sandboxFaults(glob, MAC)).toEqual([]);
	});
});

describe("allowRead that re-opens a secret path", () => {
	const OPENERS = ["~/.ssh", "~", "~/.ssh/config", "~/.aws", "~/.gnupg/**"];

	for (const entry of OPENERS) {
		test(`${entry} is named`, () => {
			expect(
				sandboxFaults(withFilesystem({ allowRead: [entry] }), MAC),
			).toEqual([{ rule: "allow-read-reopens", where: entry }]);
		});
	}

	test("an entry that touches no secret path passes", () => {
		const fine = withFilesystem({ allowRead: ["~/code", "/usr/local"] });

		expect(sandboxFaults(fine, MAC)).toEqual([]);
	});
});

describe("excludedCommands that re-open a secret path", () => {
	const OPENERS = [
		"ssh:*",
		"scp host:file .",
		"gpg --decrypt",
		"aws s3 ls",
		"docker:*",
		"cat ~/.netrc",
		"*",
	];
	const SAFE = ["git status", "bun test", "watchman:*"];

	for (const pattern of OPENERS) {
		test(`${pattern} is named`, () => {
			const snippet = withSandbox({ excludedCommands: [pattern] });

			expect(sandboxFaults(snippet, MAC)).toEqual([
				{ rule: "excluded-reopens", where: pattern },
			]);
		});
	}

	for (const pattern of SAFE) {
		test(`${pattern} is kept`, () => {
			expect(reopensSecret(pattern)).toBe(false);
		});
	}
});

describe("every row names a route", () => {
	test("each row carries the sandbox route", () => {
		for (const row of SANDBOX_KEYS) {
			expect(row.route).toBe("configure/permissions/sandbox");
		}
	});

	test("the written rows are exactly the three claudetto writes", () => {
		const written = SANDBOX_KEYS.filter((row) => row.value !== undefined);

		expect(written.map((row) => row.name)).toEqual([
			"sandbox.enabled",
			"sandbox.allowUnsandboxedCommands",
			"sandbox.filesystem.denyRead",
		]);
	});

	test("the table carries one row per key of the route", () => {
		expect(SANDBOX_KEYS.map((row) => row.name)).toEqual([
			"sandbox.enabled",
			"sandbox.autoAllowBashIfSandboxed",
			"sandbox.allowUnsandboxedCommands",
			"sandbox.failIfUnavailable",
			"sandbox.filesystem.denyRead",
			"sandbox.filesystem.allowRead",
			"sandbox.excludedCommands",
		]);
	});
});

describe.skipIf(PROGRAM === "")("every key is a real key", () => {
	test("the installed program holds every key name", async () => {
		const names = [
			"autoAllowBashIfSandboxed",
			"allowUnsandboxedCommands",
			"failIfUnavailable",
			"denyRead",
			"allowRead",
			"excludedCommands",
		];

		expect(await stringsMissing(PROGRAM, names)).toEqual([]);
	});
});
