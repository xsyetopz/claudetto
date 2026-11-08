export const TOOL_NAME = "openspec";
export const TOOL_CALL = /^mcp__claudetto-openspec__openspec$/;

export const TOOL_DESCRIPTION =
	"OpenSpec changes in `openspec/`. `status` lists the changes, or for one `change` its artifacts, task progress, and each unticked task as its `- [ ]` line with the line number. `validate` (the default) runs the strict check on one change, or on every change when `change` is absent. `archive` validates, refuses a change with an unticked task, merges its delta specs into `openspec/specs/`, and moves it to `openspec/changes/archive/`.";

export const TOOL_INPUT_SCHEMA = {
	type: "object",
	properties: {
		action: { type: "string", enum: ["status", "validate", "archive"] },
		change: { type: "string", description: "The change folder name." },
	},
	additionalProperties: false,
};

export const NO_OPENSPEC = "No openspec/changes folder in this project.";
export const NEEDS_CHANGE = "`archive` needs `change`.";
export const NO_CHANGES = "No active changes.";

export const badName = (name: string) =>
	`"${name}" is not a change name: use the folder name under openspec/changes/.`;

export const noChange = (name: string) =>
	`No change "${name}" under openspec/changes/.`;

export const statusLine = (name: string, done: number, total: number) =>
	`${name}: ${done}/${total} tasks`;

export const statusDetail = (
	name: string,
	artifacts: string[],
	done: number,
	total: number,
) =>
	`${name}: ${artifacts.length > 0 ? artifacts.join(", ") : "no artifacts"}; ${done}/${total} tasks`;

export const openLine = (line: number, text: string) =>
	`tasks.md:${line} ${text}`;

export const verdict = (name: string, valid: boolean, count: number) =>
	`${name}: ${valid ? "valid" : "INVALID"}${count > 0 ? `, ${count} issue${count === 1 ? "" : "s"}` : ""}`;

export const issueLine = (level: string, path: string, message: string) =>
	`${level} ${path}: ${message}`;

export const archived = (name: string, dest: string) =>
	`Archived ${name} to ${dest}.`;

export const refused = (name: string, why: string) =>
	`Archive of ${name} refused, nothing changed: ${why}`;
