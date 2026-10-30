import { describe, expect, test } from "bun:test";
import {
	installedProgram,
	stringsMissing,
} from "../../../../../tools/installed.ts";
import {
	AUTO_MODE_KEYS,
	AUTO_MODE_LISTS,
	AUTO_MODE_TARGET,
	type AutoModeSnippet,
	autoModeSnippet,
	autoModeTargetFile,
	DEFAULTS,
} from "../automode.ts";
import {
	autoModeFaults,
	broadAllowRules,
	CLASSIFIER_MODEL_ENV,
	isBroadAllow,
} from "../faults.ts";

const PROGRAM = (await installedProgram()) ?? "";

const withAutoMode = (
	patch: Partial<AutoModeSnippet["autoMode"]>,
): AutoModeSnippet => {
	const base = autoModeSnippet();
	return { ...base, autoMode: { ...base.autoMode, ...patch } };
};

describe("the shipped snippet", () => {
	test("has no fault", () => {
		expect(autoModeFaults(autoModeSnippet())).toEqual([]);
	});

	test("goes to the user settings file and to no project, local, or plugin file", () => {
		const file = autoModeTargetFile("/home/u/.claude");

		expect(AUTO_MODE_TARGET).toBe("user");
		expect(file).toBe("/home/u/.claude/settings.json");
		expect(file).not.toContain("settings.local.json");
	});
});

describe("every list keeps $defaults", () => {
	for (const name of AUTO_MODE_LISTS) {
		test(`the shipped ${name} list starts with it`, () => {
			expect(autoModeSnippet().autoMode[name][0]).toBe(DEFAULTS);
		});

		test(`${name} that drops it as a size trim is named`, () => {
			const trimmed = withAutoMode({ [name]: ["Only: our own short rule"] });

			expect(autoModeFaults(trimmed)).toEqual([
				{ rule: "defaults-dropped", where: name },
			]);
		});
	}

	test("a list that holds it after a rule keeps the built-ins and passes", () => {
		const moved = withAutoMode({ soft_deny: ["Our rule", DEFAULTS] });

		expect(autoModeFaults(moved)).toEqual([]);
	});

	test("an empty list counts as unset and passes", () => {
		const empty = withAutoMode({ environment: [] });

		expect(autoModeFaults(empty)).toEqual([]);
	});

	test("a list with $defaults first and rules after it passes", () => {
		const added = withAutoMode({ soft_deny: [DEFAULTS, "Our rule"] });

		expect(autoModeFaults(added)).toEqual([]);
	});
});

describe("only narrow allow rules", () => {
	const BROAD = [
		"Bash(*)",
		"Bash(bash:*)",
		"Bash(sh:*)",
		"Bash(zsh:*)",
		"Bash(python*)",
		"Bash(python3:*)",
		"Bash(bash -c *)",
	];
	const NARROW = [
		"Bash(npm test)",
		"Bash(git status)",
		"Read",
		"Bash(bun test)",
	];

	for (const rule of BROAD) {
		test(`${rule} is rejected`, () => {
			const snippet = withAutoMode({ allow: [DEFAULTS, rule] });

			expect(autoModeFaults(snippet)).toEqual([
				{ rule: "broad-allow", where: rule },
			]);
		});
	}

	for (const rule of NARROW) {
		test(`${rule} is kept`, () => {
			expect(isBroadAllow(rule)).toBe(false);
		});
	}

	test("every broad rule of a list is named, in order", () => {
		const snippet = withAutoMode({
			allow: [DEFAULTS, "Bash(npm test)", "Bash(*)", "Bash(sh:*)"],
		});

		expect(broadAllowRules(snippet)).toEqual(["Bash(*)", "Bash(sh:*)"]);
	});
});

describe("autoMode.classifyAllShell", () => {
	test("is unset in the shipped snippet", () => {
		expect(autoModeSnippet().autoMode.classifyAllShell).toBeUndefined();
	});

	test("false passes", () => {
		expect(autoModeFaults(withAutoMode({ classifyAllShell: false }))).toEqual(
			[],
		);
	});

	test("true is a fault", () => {
		expect(autoModeFaults(withAutoMode({ classifyAllShell: true }))).toEqual([
			{ rule: "classify-all-shell", where: "classifyAllShell" },
		]);
	});
});

describe("the classifier model is left to the program", () => {
	test("the shipped snippet does not hold CLAUDE_CODE_AUTO_MODE_MODEL", () => {
		expect(CLASSIFIER_MODEL_ENV in autoModeSnippet().env).toBe(false);
	});

	test("a snippet that sets it is a fault while no measurement exists", () => {
		const snippet: AutoModeSnippet = {
			...autoModeSnippet(),
			env: { [CLASSIFIER_MODEL_ENV]: "claude-haiku-5-5" },
		};

		expect(autoModeFaults(snippet)).toEqual([
			{ rule: "classifier-model", where: CLASSIFIER_MODEL_ENV },
		]);
	});
});

describe("every row names a route", () => {
	test("each row carries a route", () => {
		for (const row of AUTO_MODE_KEYS) {
			expect(row.route.length).toBeGreaterThan(0);
		}
	});

	test("the written lists are exactly the rows with a value", () => {
		const written = AUTO_MODE_KEYS.filter((row) => row.value !== undefined);

		expect(written.map((row) => row.name)).toEqual(
			AUTO_MODE_LISTS.map((name) => `autoMode.${name}`),
		);
	});
});

describe.skipIf(PROGRAM === "")("every key is a real key", () => {
	test("the installed program holds every key name", async () => {
		const names = [
			"autoMode",
			"classifyAllShell",
			"CLAUDE_CODE_AUTO_MODE_MODEL",
		];

		expect(await stringsMissing(PROGRAM, names)).toEqual([]);
	});

	test("the installed program holds the name of every list", async () => {
		expect(await stringsMissing(PROGRAM, [...AUTO_MODE_LISTS])).toEqual([]);
	});
});
