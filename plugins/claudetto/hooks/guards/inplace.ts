import type { On } from "claude-code";

import { fault } from "../shared/fault";

/** What the model reads when an in-place edit is refused (REQ-GUARDS-079). */
export const REASON =
	"Use the Edit tool for this change, not an in-place sed or perl: Edit refuses a file you have not read, and it shows the diff of the change. Read the file, then Edit it.";

/** Quoted text, which can name `sed -i` without running it. */
const QUOTED = /'[^']*'|"(?:[^"\\]|\\.)*"/gu;

/**
 * Matches `sed` or `perl` in command position with an in-place flag among its
 * arguments. Command position is the start of a line, after a separator, a
 * grouping bracket or a loop keyword, or behind a wrapper such as `xargs`,
 * `find -exec` or `env`. The flag is `--in-place` or a cluster that ends in `i`
 * and holds only letters that sed and perl take with it (`-i`, `-Ei`, `-ni`,
 * `-pi`, `-0pi`, `-lpi`), so `perl -MFile::Spec` and `-Ilib` stay out.
 */
export const IN_PLACE =
	/(?:^|[;&|({\n]|\b(?:do|then|else|exec|sudo|nohup|time|\w+=\S*|env(?:\s+\w+=\S*)*|xargs(?:\s+-\S+(?:\s+\d+)?)*(?:\s+env(?:\s+\w+=\S*)*)?)|-exec)\s*(?:\S*\/)?(?:sed|perl)\s(?:[^;&|\n]*?\s)?(?:-[0-9nEprszulwa]*i|--in-place)/u;

/**
 * Whether a Bash command edits a file in place with sed or perl. Quoted text is
 * blanked first, so `echo "sed -i"` and a `s/ -i/x/` expression do not count; a
 * heredoc body is not blanked, so a line that starts with `sed -i` inside one does.
 *
 * @param command The Bash command as the model wrote it.
 * @returns True when the command runs `sed -i`, `perl -pi` or the like.
 */
export const editsInPlace = (command: string): boolean =>
	IN_PLACE.test(command.replaceAll(QUOTED, "''"));

/**
 * Refuses an in-place sed or perl edit with a pointer to the Edit tool
 * (REQ-GUARDS-079). The check runs on the model's own command, before any
 * rewrite and with no dependence on a hook's best-effort `if` filter, so a
 * command that Claude Code cannot split is judged like any other.
 */
export function registerInplace(on: On): void {
	on("tool.call", { tool: "Bash" }, (_$, e, next) =>
		e.tool === "Bash" && editsInPlace(e.command) ? { deny: REASON } : next(e)
	).catch(($, e, next) => {
		fault($, "in-place edit guard", next.error);
		return next(e);
	});
}
