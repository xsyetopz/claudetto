import type { On } from "claude-code";

import { fault } from "../shared/fault";
import { registerHeredoc } from "./heredoc";

/**
 * What the model reads when an in-place edit is refused (GUARDS-079). It names `patch`, the
 * edit tool claudetto offers, because the Edit tool is hidden (TOOLS-001) and a reason naming
 * it sent the model on to `perl -pi`, which the sandbox refuses in a loaded plugin's folder (RISK-542).
 */
export const REASON =
	"Use the mcp__claudetto__patch tool for this change, not an in-place sed: patch writes only where its context lines match the file, writes nothing when one fails, and lists each file it changed. For one change across many places, `perl -0pi -e` is allowed and shows a diff stat.";

/** A heredoc: the start line (kept) and the body up to its delimiter line, which is text, not commands. */
const HEREDOC =
	/(<<-?[ \t]*(['"]?)(\w+)\2[^\n]*\n)[\s\S]*?\n[ \t]*\3(?=\n|$)/gu;

/** Quoted text, which can name `sed -i` without running it. */
const QUOTED = /'[^']*'|"(?:[^"\\]|\\.)*"/gu;

/**
 * Matches `sed` in command position with an in-place flag among its
 * arguments. Command position is the start of a line, after a separator, a
 * grouping bracket or a loop keyword, or behind a wrapper such as `xargs`,
 * `find -exec` or `env`. The flag is `--in-place` or a cluster that ends in `i`
 * and holds only letters sed takes with it (`-i`, `-Ei`, `-ni`). Perl is not
 * matched: EDIT-001 allows `perl -0pi -e` and notes the diff stat.
 */
export const IN_PLACE =
	/(?:^|[;&|({\n]|\b(?:do|then|else|exec|sudo|nohup|time|\w+=\S*|env(?:\s+\w+=\S*)*|xargs(?:\s+-\S+(?:\s+\d+)?)*(?:\s+env(?:\s+\w+=\S*)*)?)|-exec)\s*(?:\S*\/)?sed\s(?:[^;&|\n]*?\s)?(?:-[nErsuz]*i|--in-place)/u;

/**
 * Whether a Bash command edits a file in place with sed. Heredoc bodies and
 * quoted text are blanked first, so `echo "sed -i"`, a `s/ -i/x/` expression
 * and a `sed -i` line inside a heredoc do not count.
 *
 * @param command The Bash command as the model wrote it.
 * @returns True when the command runs `sed -i` or the like.
 */
export const editsInPlace = (command: string): boolean =>
	IN_PLACE.test(command.replaceAll(HEREDOC, "$1").replaceAll(QUOTED, "''"));

/**
 * Refuses an in-place sed edit with a pointer to the patch tool
 * (GUARDS-079). The check runs on the model's own command, before any
 * rewrite and with no dependence on a hook's best-effort `if` filter, so a
 * command that Claude Code cannot split is judged like any other.
 */
export function registerInplace(on: On): void {
	registerHeredoc(on);
	on("tool.call", { tool: "Bash" }, (_$, e, next) =>
		e.tool === "Bash" && editsInPlace(e.command) ? { deny: REASON } : next(e)
	).catch(($, e, next) => {
		fault($, "in-place edit guard", next.error);
		return next(e);
	});
}
