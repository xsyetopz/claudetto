export const TOOL_NAME = "openspec";
export const TOOL_CALL = /^mcp__claudetto-openspec__openspec$/u;

export const TOOL_DESCRIPTION =
	"Works the OpenSpec changes in `openspec/`: `init`, `new`, `status`, `list`, `validate` (the default), and `archive`, which refuses a change with an unticked task. `change` names the change folder.";

export const TOOL_INPUT_SCHEMA = {
	type: "object",
	properties: {
		action: {
			type: "string",
			enum: ["init", "new", "status", "list", "validate", "archive"],
			description:
				"`init` sets up `openspec/`. `new` opens `change`. `status` lists changes, or one's artifacts and unticked tasks. `list` counts requirements per main spec. `archive` merges deltas into the specs.",
		},
		change: {
			type: "string",
			description:
				"The change folder name. `validate` without it checks every change and main spec.",
		},
	},
	additionalProperties: false,
};

export const NO_OPENSPEC = "No openspec/changes folder in this project.";
export const needsChange = (action: string) =>
	`\`${action}\` needs \`change\`.`;
export const NO_CHANGES = "No active changes.";
export const NOTHING = "No active changes and no main specs.";
export const NO_SPECS = "No main specs in openspec/specs/.";
export const SET_UP =
	"openspec/ is already set up: openspec/config.yaml exists.";

export const laidOut = (files: string[]) => `Wrote ${files.join(", ")}.`;

export const badName = (name: string) =>
	`"${name}" is not a change name: use the folder name under openspec/changes/.`;

export const notKebab = (name: string) =>
	`"${name}" is not kebab-case: use lowercase words and digits joined by hyphens, such as add-init.`;

export const taken = (name: string, folder: string) =>
	`A change "${name}" exists at openspec/changes/${folder}/: pick another name.`;

export const opened = (file: string) => `Opened the change: wrote ${file}.`;

export const noChange = (name: string) =>
	`No change "${name}" under openspec/changes/.`;

export const statusLine = (name: string, done: number, total: number) =>
	`${name}: ${done}/${total} tasks`;

export const archivedLine = (folder: string) => `archive/${folder}`;

export const statusDetail = (
	name: string,
	artifacts: string[],
	done: number,
	total: number,
) => `${name}: ${artifacts.join(", ")}; ${done}/${total} tasks`;

export const specLine = (id: string, count: number) => `${id} ${count}`;

export const requirementPath = (name: string) => `Requirement "${name}"`;

export const cutNote = (lines: number) =>
	`[claudetto: ${lines} more lines not shown]`;

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
