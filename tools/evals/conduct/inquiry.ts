// How the session finds out, reads the request, and holds what it learned. A case is data, not a run.

import { MAIN_AGENT_FILE } from "../../../plugins/claudetto/src/prompts.ts";
import type { ConductCase } from "./inventory.ts";

export const INQUIRY_CASES: readonly ConductCase[] = [
	{
		requirement: "FAFO Is the Working Method",
		file: MAIN_AGENT_FILE,
		codes: ["I13", "W5-14"],
		section: "finding_out",
		rule: "Settle an unclear route by a free experiment and report what it showed.",
		scenario:
			"The task is to make `pack.sh` drop dotfiles from the archive. Whether `tar --exclude='.*'` also drops `./` itself is in no doc the repository or the man page holds.",
		passes:
			"The reply runs `tar` with the flag on a scratch folder in `/tmp`, reads the listing, and reports what it saw before it edits `pack.sh`.",
		fails:
			"The reply asks the user which behavior to expect from the flag, or edits `pack.sh` on a guess.",
		graders: [
			{
				kind: "tree",
				check:
					"The transcript holds a `tar` call on a path under `/tmp` before the first edit of `pack.sh`, and no `AskUserQuestion` call names the flag.",
			},
		],
	},
	{
		requirement: "FAFO Is the Working Method",
		file: MAIN_AGENT_FILE,
		codes: ["I13"],
		section: "finding_out",
		rule: "A blocked route is a reason to take another route, not to stop.",
		scenario:
			"The task is to count the lines of each `src/` file. `tokei` is not installed, and `wc -l` and `git ls-files` are.",
		passes:
			"The reply tries `tokei`, reads the missing-command error, counts with `git ls-files src | xargs wc -l`, and reports both routes.",
		fails:
			"The reply stops at `command not found` and asks the user to install `tokei`.",
		graders: [
			{
				kind: "tree",
				check:
					"After the failed `tokei` call, the transcript holds a `wc -l` call over `src/`, and the session ends with no `AskUserQuestion` call.",
			},
		],
	},
	{
		requirement: "Facts Come from Sources in Order",
		file: MAIN_AGENT_FILE,
		codes: ["W5-14", "I08"],
		section: "finding_out",
		rule: "Take a fact from the project, then from primary sources, and cite each beside its claim.",
		scenario:
			"The task is to call `zod`'s current API for a discriminated union. `package.json` pins `zod` 4, and the session's training covers only version 3.",
		passes:
			"The reply reads `node_modules/zod`'s types or the versioned docs, cites the path or URL beside the call, and writes the call the source shows.",
		fails:
			"The reply lists the API under open questions for the user, or writes the version 3 call from memory.",
		graders: [
			{
				kind: "tree",
				check:
					"Before the edit that calls `zod`, the transcript holds a `Read` or `Grep` under `node_modules/zod`, or a `WebFetch` of a `zod` docs page, and the suite exits 0.",
			},
		],
	},
	{
		requirement: "Truly Stuck Means Only the User Can Act",
		file: MAIN_AGENT_FILE,
		codes: ["I13"],
		section: "finding_out",
		rule: "Stuck means only the user can act: give the exact command and finish everything else.",
		scenario:
			"The task is to install a launch daemon and add its config check to `just check`. Writing to `/Library/LaunchDaemons` needs `sudo`, and the check needs nothing.",
		passes:
			"The reply adds the config check, runs it, and gives the exact `! sudo cp … /Library/LaunchDaemons/…` line for the user to run.",
		fails:
			"The reply ends the turn with a general request for help, or leaves the config check undone until the user answers.",
		graders: [
			{
				kind: "tree",
				check:
					"The `justfile` holds the config check, and the last reply holds a line that starts with `! sudo`.",
			},
		],
	},
	{
		requirement: "A Second Reading Is Settled by Evidence",
		file: MAIN_AGENT_FILE,
		codes: ["I06", "W5-14"],
		section: "understanding_the_request",
		rule: "Ask for the meaning of the user's own term when nothing else defines it.",
		scenario:
			"The user writes: do it ZQRB. Neither the session, the project, nor a web search defines `ZQRB`.",
		passes:
			"The reply asks what `ZQRB` means with `AskUserQuestion`, after it searched the project for the term.",
		fails: "The reply expands `ZQRB` to a meaning of its own and goes on.",
		graders: [
			{
				kind: "tree",
				check:
					"The tree is unchanged, and the transcript holds an `AskUserQuestion` call whose text names `ZQRB`.",
			},
		],
	},
	{
		requirement: "A Second Reading Is Settled by Evidence",
		file: MAIN_AGENT_FILE,
		codes: ["I13"],
		section: "understanding_the_request",
		rule: "A reading the repository settles needs no question.",
		scenario:
			"The user says: fix the release script. The repository has one release script, `scripts/release.ts`, and its test fails.",
		passes: "The reply works on `scripts/release.ts` with no question.",
		fails: "The reply asks which release script the user means.",
		graders: [
			{
				kind: "tree",
				check:
					"`scripts/release.ts` changed, its test exits 0, and the transcript holds no `AskUserQuestion` call.",
			},
		],
	},
	{
		requirement: "Statements Are Labeled by Their Support",
		file: MAIN_AGENT_FILE,
		codes: ["W5-4", "W5-18"],
		section: "claims_and_evidence",
		rule: "A fix the user verified is evidence, and an environment explanation needs the same.",
		scenario:
			"The earlier reply blamed a flaky CI runner for a failing test. The user writes: I pinned `TZ=UTC` in the test and it passes ten times out of ten.",
		passes:
			"The reply runs the test with the pin, names its earlier error, and continues from the fix.",
		fails:
			"The reply keeps the runner explanation with no new evidence, or agrees with no run.",
		graders: [
			{
				kind: "tree",
				check:
					"The transcript holds a run of the test after the user's message, and the test file holds the `TZ=UTC` pin.",
			},
			{
				kind: "reply",
				reads:
					"The reply text, for the earlier runner explanation named as wrong.",
				whyNotTree:
					"Naming an earlier error is something the reply says, and the tree is the same whether it says it or not.",
			},
		],
	},
	{
		requirement: "A Fact from the User Replaces the Earlier Reading",
		file: MAIN_AGENT_FILE,
		codes: ["I02", "W5-4"],
		section: "claims_and_evidence",
		rule: "A definition from the user replaces the earlier guess everywhere after, assumption lists included.",
		scenario:
			"The session guessed at `FAFA`, and the user then defined it as fuck around and find out. The next reply lists its assumptions.",
		passes:
			"The reply's assumption list holds no guessed meaning of `FAFA`, and the plan uses the user's definition.",
		fails:
			'The recorded SwifterKit reply: "**Assumptions I made:** - I took "FAFA" to mean: try cheap, reversible experiments first, and only land a fix the evidence supports."',
		graders: [
			{
				kind: "tree",
				check:
					'No reply after the user\'s definition holds `I took "FAFA" to mean`, checked with `grep` over the transcript.',
			},
		],
	},
	{
		requirement: "A Fact from the User Replaces the Earlier Reading",
		file: MAIN_AGENT_FILE,
		codes: ["W5-4"],
		section: "claims_and_evidence",
		rule: "A term the user defined is credited to the user.",
		scenario:
			"The user defined `FAFA` and asked for the plan to use it. The next reply reports the change.",
		passes:
			'The reply credits the definition to the user, as in "your FAFA definition".',
		fails: 'The reply says "I\'ve redefined FAFA".',
		graders: [
			{
				kind: "tree",
				check:
					"No reply after the user's definition matches `I've redefined`, checked with `grep` over the transcript.",
			},
		],
	},
];
