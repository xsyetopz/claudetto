// The differences from OpenSpec that design D10 names, and the shape of a case of the parity test.

import type { Run } from "./shared.ts";

/** The differences from OpenSpec that design D10 names ("Differences from OpenSpec"), with the reason of each. */
export const DIFFERENCES = {
	"empty-project":
		"`new change` works in a project with no `openspec/` folder, with no copied schema, and writes no `config.yaml`",
	"task-lines":
		"A task is a line that starts with `- [ ]` or `- [x]`, as in `countTasks` (OpenSpec has no issue for it, #1761 is related)",
	messages:
		"The text of an error differs, and the exit code is the same (OpenSpec has no issue for it)",
	"no-tip":
		"The message for a change with no delta leaves out the tip about `openspec change show` (OpenSpec has no issue for it)",
	"done-needs-content":
		"`status` gives `done` for an artifact only when each `##` section of its template has text (OpenSpec issue #1084), so a `proposal.md` without `Capabilities` and `Impact` is `ready`",
	"step-warning":
		"`validate` gives a WARNING for a scenario with no `WHEN` or `GIVEN` step, or no `THEN` step (OpenSpec issue #2078, PR #2079)",
	"overlap-warning":
		"`validate` gives a WARNING when another open change has a `MODIFIED`, `REMOVED`, or `RENAMED` entry for the same requirement (OpenSpec issue #1669)",
	"task-number-warning":
		"`validate` gives a WARNING for a duplicate task number or a task number out of order in `tasks.md` (OpenSpec issue #311)",
	"scenario-rename":
		"A `MODIFIED` block declares a scenario rename with `RENAMED SCENARIO FROM` and `TO`, so the old scenario is not dropped (OpenSpec issue #1697, PR #1843)",
	"open-tasks-json":
		"`archive --yes --json` puts `openTasks` in the JSON when `tasks.md` has an open task (OpenSpec issue #2006)",
	"unknown-flag":
		"An unknown flag exits `2` with the usage, and OpenSpec exits `1` with the error of its parser (OpenSpec has no issue for it)",
	"refusal-error":
		"`validate` gives an ERROR, not an INFO, when the archive would refuse the delta (OpenSpec issue #1112), so the item is not valid and the exit code is `1`",
	"fence-info-string":
		"A fence follows the rules of CommonMark: a backtick fence with a backtick in its info string opens no fence, and a line with 4 spaces and a fence run opens none at the top level, so the requirement after it stays visible (OpenSpec issue #2130)",
	"closing-hashes":
		"A closing run of `#` on a section title, such as `## ADDED Requirements ##`, is no part of the title, so the section counts (OpenSpec issue #2145)",
	"dup-main-requirement":
		"`validate` gives the ERROR `Duplicate requirement in specification` with the path `requirements[<index>]` for a main spec with a repeated requirement, and OpenSpec gives another text with the path `file` and a line (OpenSpec issue #2132)",
	"yaml-parse-error":
		"A broken `openspec/config.yaml` fails with `Cannot parse <file>` and exit `1`, and OpenSpec warns and goes on with exit `0` (OpenSpec issue #1892)",
} as const;

export type Difference = keyof typeof DIFFERENCES;

export interface Case {
	name: string;
	args: string[];
	empty?: boolean;
	overlays?: string[];
	/** `false` when only the exit code and the files are compared, because the error texts differ. */
	text?: boolean;
	differences?: Difference[];
	/** The record that `minispec` gives, from the projection of the OpenSpec record, when the case has a difference. */
	expected?: (openspecProjection: Run) => Run;
}
