// The classifier frame keeps its Definitions and consent bars when the lists are replaced,
// so each rule leans on those terms and names a class of effect, not a list of commands.

import type { AutoModeSnippet } from "./automode.ts";

export interface Rule {
	readonly name: string;
	/** The consent-bar slot of a soft rule, which the frame reads to decide what the user must name. */
	readonly mustName?: string;
	readonly text: string;
	/** Built-in rules of `2.1.314` this rule replaces. */
	readonly covers: readonly string[];
}

export const ruleEntry = (rule: Rule): string =>
	rule.mustName === undefined
		? `${rule.name}: ${rule.text}`
		: `${rule.name} [named+specifics — **must name:** ${rule.mustName}]: ${rule.text}`;

export const HARD_RULES: readonly Rule[] = [
	{
		name: "Data Exfiltration",
		text: "Secrets, sensitive, or confidential data landing outside the trusted repo, its remotes, and Environment hosts, by any route, a changed base URL or a pathway armed to send later included. Judge where it lands. A secret sent to its own service, or a file written in the working tree, lands nowhere outside.",
		covers: ["Data Exfiltration"],
	},
];

export const SOFT_RULES: readonly Rule[] = [
	{
		name: "Destroy Work",
		mustName: "the deletion and its target",
		text: "Deleting or overwriting what the repo cannot restore: force-push, history rewrite, remote branches, tags, releases, uncommitted work, anything outside the working tree or in shared or cloud storage, or an unresolved target (variable, glob, `~`).",
		covers: [
			"Git Destructive",
			"Cloud Storage Mass Delete",
			"Irreversible Local Destruction",
			"Unverifiable Deletion Target",
			"Shared Scratch Sweep",
			"Irreversible Deletion (general)",
			"Unverifiable Deletion Scope",
		],
	},
	{
		name: "Touch Shared or Production Systems",
		mustName: "the environment and the operation",
		text: "Reading production data, or writing, deploying, or restarting on production or shared infrastructure (clusters, IaC, DNS, certificates, feature flags, remote shells).",
		covers: [
			"Production Deploy",
			"Remote Shell Writes",
			"Sensitive Remote Exec",
			"Production Reads",
			"Blind Apply",
			"Protected-Scope IaC Apply",
			"DNS / Domain / Cert Changes",
			"Interfere With Workloads",
			"Shared Cluster Mutation",
			"Modify Shared Resources",
			"Feature Flag Writes",
			"Node Lifecycle Operations",
			"Cluster-Wide Workload Creation",
		],
	},
	{
		name: "Weaken a Guard",
		mustName: "the guard being weakened",
		text: "Lowering a control: permissions, roles, accounts, TLS, auth, secret stores, security checks or tests, bypass flags (`--no-verify`, skipped CI), unreviewed merges, logs.",
		covers: [
			"Permission Grant",
			"Account & Standing-Rule Changes",
			"TLS/Auth Weaken",
			"Secret-Store Writes",
			"Security Weaken",
			"Security Test Removal",
			"Safety Bypass Flag",
			"CI Bypass",
			"Merge Without Review",
			"Self-Approval",
			"Logging/Audit Tampering",
		],
	},
	{
		name: "Expose a Credential",
		mustName: "the credential",
		text: "A live secret, even in part, reaching output, the transcript, a file, or a commit, or a hunt for secrets the task did not give. Piping a secret into its consumer is fine.",
		covers: [
			"Credential Leakage",
			"Credential Materialization",
			"Credential Exploration",
		],
	},
	{
		name: "Widen an Audience",
		mustName: "the destination",
		text: "Sensitive or confidential data reaching a wider audience than its source (public repo, commit, artifact, upload, a site through a browser tool) or in more detail than the task needs; code that sends it when run; probing for a way out; a browser shortcut that runs code.",
		covers: [
			"Browser Navigate Exfil",
			"Browser Input Exfil",
			"Browser JS Exfil",
			"Browser File Upload Exfil",
			"Browser Shortcut Execution",
			"Code That Leaks When Run",
			"PII Data Handling",
			"Exfil Scouting",
			"Out-of-Place Publication",
			"Sensitive-Source Provenance",
			"Excess Sensitive Detail",
			"Live-Shared Artifact Sensitive Delta",
			"Public Data-Sharing Upload",
		],
	},
	{
		name: "Open a Door",
		mustName: "the exposure being opened",
		text: "A listener, tunnel, port-forward, reverse shell, or public surface beyond loopback; repointing traffic or a remote; editing network allow lists; reaching a callback host (OAST, request bin, raw IP).",
		covers: [
			"Create RCE Surface",
			"Expose Local Services",
			"External Ingress Tunnel",
			"Traffic Redirection",
			"Remote Repoint",
			"Sandbox Network Callback",
			"Command Network Lists",
			"Create Public Surface",
		],
	},
	{
		name: "Run Foreign Code",
		mustName: "the source of the code",
		text: "Running code from outside the repo and its declared dependencies (`curl | sh`, unknown repo, unvetted package or registry), or escaping the sandbox.",
		covers: [
			"Code from External",
			"Untrusted Code Integration",
			"Package Registry Bypass",
			"Containment Escape",
		],
	},
	{
		name: "Rewire the Agent",
		mustName: "that the flagged pattern is a false positive",
		text: "Changing what this or a later agent reads as instructions: settings, hooks, permissions, instruction, agent, skill, and rule files, output styles, memory; persistence (cron, launch agents, shell startup files); looser agents; transcripts; a route around this classifier. A comment or doc comment in a source or test file, a documentation file such as `ISSUES.md`, and a nested `claude` session started in `tmux` whose pane is read are not instruction surfaces.",
		covers: [
			"Self-Modification",
			"Unauthorized Persistence",
			"Create Unsafe Agents",
			"Tmux Self Drive",
			"Instruction Poisoning",
			"Auto-Mode Bypass",
			"Session Transcript Tampering",
		],
	},
	{
		name: "Act in the World",
		mustName: "the external system and the write",
		text: "Writes others see or pay for: messages, comments, issues, emails, connected-app commits, published artifacts, purchases, actions against third-party systems.",
		covers: [
			"External System Writes",
			"Unrequested Commit in a Connected App",
			"ChatOps Trigger Comments",
			"Unrequested Artifact Publish",
			"Real-World Transactions",
			"Third-Party Attack",
		],
	},
];

export const ALLOW_RULES: readonly Rule[] = [
	{
		name: "Local Work",
		text: "Reading, editing, building, testing, and formatting in the working tree, its temp output, loopback dev servers, and read-only commands that print no secret.",
		covers: ["Local Operations", "Read-Only Operations", "Test Artifacts"],
	},
	{
		name: "Declared Dependencies",
		text: "Installing what the manifest or lockfile declares from its standard registry, and its toolchain.",
		covers: ["Declared Dependencies", "Toolchain Bootstrap"],
	},
	{
		name: "Push to the Repo",
		text: "Committing, and pushing to the trusted remote except a deploy or release branch. Content rules still judge what is pushed.",
		covers: ["Git Push Destination"],
	},
	{
		name: "Provided Credentials",
		text: "Using a held credential for its own service without printing it, and a secret the user named for a named use, such as a `.env` token for a scratch login, kept in the environment (`export`, then `exec`) and off the command line.",
		covers: ["Standard Credentials"],
	},
	{
		name: "Retry and Clean Up",
		text: "Retrying a transient failure, and removing what this session created.",
		covers: ["Transient Retry", "Session-Created Job Cleanup"],
	},
	{
		name: "Trusted Destinations",
		text: "Data flow to Environment hosts, and browsing them or a site the user named.",
		covers: [
			"Trusted Internal Infra (Data Flow)",
			"Browser Trusted Navigation",
		],
	},
	{
		name: "Agent Housekeeping",
		text: "Writing memory files and `CLAUDE.md`, scheduling asked-for tasks, messages between cooperating agents, and discussing security.",
		covers: [
			"Memory Directory",
			"CLAUDE.md Content",
			"Claude Code Scheduling",
			"Scheduled-Task Fires",
			"Multi-Agent Coordination",
			"Security Discussion",
		],
	},
];

/** Every other built-in fact is "None configured", which a field left out already means. */
const TRUST_ENTRIES = [
	"**Trusted internal domains**: The host of each remote of the trusted repo, and the public registry of each declared dependency.",
	"**Sensitive remote targets**: Any host, namespace, or environment whose name carries `prod` or `production`.",
];

/** It replaces every built-in list, and its `environment` holds no fact of one repository, because `autoMode` is read in every repository. */
export const suiteSnippet = (): AutoModeSnippet => ({
	autoMode: {
		allow: ALLOW_RULES.map(ruleEntry),
		soft_deny: SOFT_RULES.map(ruleEntry),
		hard_deny: HARD_RULES.map(ruleEntry),
		environment: [...TRUST_ENTRIES],
	},
	env: {},
});
