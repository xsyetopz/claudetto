import type { HookFor, On } from "claude-code";
import type { Block, BlockContext } from "../block.ts";

export const INTERVIEW_TEXT = `Write this project's memory files with the user, through an interview.

1. Read the repository first: the manifests, the task runner, the CI files, the lint and format configs, the existing \`CLAUDE.md\`, \`AGENTS.md\`, \`CLAUDE.local.md\`, and \`.claude/rules/\`. Read \`~/.claude/CLAUDE.md\` and \`~/.claude/rules/\` too.
2. Ask the user with \`AskUserQuestion\` only what the files do not show: conventions, the reasons behind them, and what a new contributor gets wrong. Never ask what a file already answers.
3. Ask which scope each instruction belongs to:
   - global: \`~/.claude/CLAUDE.md\`, for every project of this user;
   - repo: \`AGENTS.md\`, shared through git;
   - local: \`./CLAUDE.local.md\`, this user in this repo, not committed;
   - user rules: \`~/.claude/rules/<topic>.md\`;
   - repo rules: \`.claude/rules/<topic>.md\`, with \`paths\` frontmatter when a rule holds only for some files.
4. Show the full draft of each file, and write only after the user says yes to it.

Repo layout: the text lives in \`AGENTS.md\`, and \`CLAUDE.md\` holds exactly the title \`# CLAUDE.md\`, a blank line, and the import \`@AGENTS.md\`. When \`CLAUDE.md\` already holds text, ask before moving it into \`AGENTS.md\`.

Each line is read in every session and costs tokens there. Keep a line only when it changes what Claude does, and leave out what the code, the manifests, or a command's \`--help\` already shows.`;

// A user's own skill named `init` is theirs to keep, so only the built-in is replaced.
const onInitSkill: HookFor<"skill.prompt"> = async (_$, e, next) =>
	e.source === "built-in" ? { text: INTERVIEW_TEXT } : next(e);

/** A `command.run` answer only prints, and the interview has to reach the model. */
export const initInterview: Block = {
	id: "init-interview",
	kind: "prompt",
	routes: ["skill.prompt"],
	needs: "2.1.314",
};

export const attachInitInterview = (on: On, _context: BlockContext): void => {
	on("skill.prompt", { skill: "init" }, onInitSkill);
};
