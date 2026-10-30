import { describe, expect, test } from "bun:test";
import { AUTO_MODE_LISTS, DEFAULTS } from "../automode.ts";
import { autoModeFaults } from "../faults.ts";
import {
	ALLOW_RULES,
	HARD_RULES,
	type Rule,
	ruleEntry,
	SOFT_RULES,
	suiteSnippet,
} from "../rules.ts";

// Read from `system[1]` of `just capture --classifier --dump DIR` on `2.1.314`, since the program holds them compressed.
const BUILTIN_HARD = ["Data Exfiltration"];

const BUILTIN_SOFT = [
	"Git Destructive",
	"Code That Leaks When Run",
	"Code from External",
	"Cloud Storage Mass Delete",
	"Production Deploy",
	"Remote Shell Writes",
	"Sensitive Remote Exec",
	"Production Reads",
	"Blind Apply",
	"Protected-Scope IaC Apply",
	"Logging/Audit Tampering",
	"Permission Grant",
	"Account & Standing-Rule Changes",
	"TLS/Auth Weaken",
	"Secret-Store Writes",
	"DNS / Domain / Cert Changes",
	"Security Weaken",
	"Security Test Removal",
	"Safety Bypass Flag",
	"Create Unsafe Agents",
	"Interfere With Workloads",
	"Shared Cluster Mutation",
	"CI Bypass",
	"Modify Shared Resources",
	"Irreversible Local Destruction",
	"Unverifiable Deletion Target",
	"Shared Scratch Sweep",
	"Irreversible Deletion (general)",
	"Unverifiable Deletion Scope",
	"Create RCE Surface",
	"Expose Local Services",
	"External Ingress Tunnel",
	"Credential Leakage",
	"Credential Materialization",
	"Credential Exploration",
	"PII Data Handling",
	"Exfil Scouting",
	"Traffic Redirection",
	"Remote Repoint",
	"Out-of-Place Publication",
	"Sensitive-Source Provenance",
	"Excess Sensitive Detail",
	"Unrequested Artifact Publish",
	"Live-Shared Artifact Sensitive Delta",
	"Sandbox Network Callback",
	"Command Network Lists",
	"Containment Escape",
	"Create Public Surface",
	"Public Data-Sharing Upload",
	"Untrusted Code Integration",
	"Package Registry Bypass",
	"Unauthorized Persistence",
	"Self-Modification",
	"Tmux Self Drive",
	"Instruction Poisoning",
	"Auto-Mode Bypass",
	"Session Transcript Tampering",
	"Unrequested Commit in a Connected App",
	"External System Writes",
	"Merge Without Review",
	"Self-Approval",
	"ChatOps Trigger Comments",
	"Feature Flag Writes",
	"Node Lifecycle Operations",
	"Cluster-Wide Workload Creation",
	"Real-World Transactions",
	"Third-Party Attack",
	"Browser Navigate Exfil",
	"Browser Input Exfil",
	"Browser JS Exfil",
	"Browser File Upload Exfil",
	"Browser Shortcut Execution",
];

const BUILTIN_ALLOW = [
	"Security Discussion",
	"Transient Retry",
	"Test Artifacts",
	"Local Operations",
	"Read-Only Operations",
	"Declared Dependencies",
	"Toolchain Bootstrap",
	"Standard Credentials",
	"Session-Created Job Cleanup",
	"Git Push Destination",
	"Trusted Internal Infra (Data Flow)",
	"Scheduled-Task Fires",
	"Multi-Agent Coordination",
	"Memory Directory",
	"CLAUDE.md Content",
	"Claude Code Scheduling",
	"Browser Trusted Navigation",
];

const covered = (rules: readonly Rule[]): readonly string[] =>
	rules.flatMap((rule) => rule.covers).toSorted();

describe("the suite covers every built-in rule it replaces", () => {
	const lists = [
		["hard_deny", HARD_RULES, BUILTIN_HARD],
		["soft_deny", SOFT_RULES, BUILTIN_SOFT],
		["allow", ALLOW_RULES, BUILTIN_ALLOW],
	] as const;

	for (const [name, rules, builtin] of lists) {
		test(`each built-in ${name} rule is covered once, and nothing else is named`, () => {
			expect(covered(rules)).toEqual(builtin.toSorted());
		});

		test(`${name} holds fewer rules than it replaces`, () => {
			expect(rules.length).toBeLessThanOrEqual(builtin.length);
		});
	}
});

describe("each entry reads like a built-in entry", () => {
	test("a soft rule carries the consent bar the classifier frame reads", () => {
		const entry = ruleEntry({
			name: "Destroy Work",
			mustName: "the target",
			text: "Deleting it.",
			covers: [],
		});

		expect(entry).toBe(
			"Destroy Work [named+specifics — **must name:** the target]: Deleting it.",
		);
	});

	test("a rule with no bar has a plain name", () => {
		expect(ruleEntry({ name: "Local Work", text: "Tests.", covers: [] })).toBe(
			"Local Work: Tests.",
		);
	});

	test("every soft rule has a bar, and no hard or allow rule has one", () => {
		expect(SOFT_RULES.every((rule) => rule.mustName !== undefined)).toBe(true);
		expect(
			[...HARD_RULES, ...ALLOW_RULES].every(
				(rule) => rule.mustName === undefined,
			),
		).toBe(true);
	});
});

describe("the suite snippet", () => {
	test("holds no $defaults in any list", () => {
		for (const name of AUTO_MODE_LISTS) {
			expect(suiteSnippet().autoMode[name]).not.toContain(DEFAULTS);
			expect(suiteSnippet().autoMode[name].length).toBeGreaterThan(0);
		}
	});

	test("is not what setup writes, so the fault check still names each list", () => {
		expect(autoModeFaults(suiteSnippet()).map((fault) => fault.where)).toEqual([
			...AUTO_MODE_LISTS,
		]);
	});
});
