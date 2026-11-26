import type { On } from "claude-code";

import { fault } from "../../shared/fault";
import { registerPromptLog } from "../log-paste";
import { maskFor, shapesOnly } from "./redact";

/** The origins a person types or pastes into: the terminal, Remote Control, and an SDK host's `-p`. */
const TYPED = new Set(["composer", "bridge", "sdk"]);

/** What the person reads when a prompt is held back. */
export const HELD =
	"claudetto held this prompt back: it holds a credential-shaped value, and a sent prompt is stored " +
	"in plain text in the session file and goes to the model. The same text submitted again is sent as it is.";

/**
 * A secret named in prose, as people paste one: "password Hk7#qL9vZ2pW", "the
 * token is ab12cd34ef". betterleaks and ASSIGNMENT need `=` or `:` (probed
 * 2026-11-24, betterleaks 1.10.1), so the prose form passed both. The value
 * holds a letter and a digit, so "the token parser" does not match.
 */
const PROSE =
	/\b(?:password|passwd|passphrase|secret|token|api[ _-]?key)\b(?:\s+is)?\s*[:=]?\s*["'`]?(?=[^\s"'`]*\d)(?=[^\s"'`]*[A-Za-z])[^\s"'`]{8,}/iu;

/**
 * Whether a prompt holds a secret: the redact guard's mask finds one, the
 * fallback key shapes do (betterleaks reports an AWS key ID only beside its
 * secret key), or PROSE does. Broader than the tool-output mask, because a
 * false match here costs one Enter, not a masked result.
 */
export const holdsSecret = (
	text: string,
	mask: (t: string) => string
): boolean =>
	mask(text) !== text || shapesOnly(text) !== text || PROSE.test(text);

/**
 * Holds back a typed prompt that carries a credential (RISK-526). Claude Code
 * 2.1.331 writes a sent prompt verbatim to the session file and the model
 * reads it: a pasted password and AWS key each landed 5 to 8 times in the
 * session file, vanilla and claudetto alike (probe 2026-11-24). Masking would
 * hide the value from the model the person meant to give it to, so the prompt
 * is dropped with the reason, and the same text sent again goes through: a
 * false match costs one Enter. The engine puts a dropped prompt back in the
 * box itself (probed interactive, 2.1.331), so the person edits or resends it.
 * A slash command's line is checked too: its arguments reach the session file
 * (6 copies, vanilla, probe 2026-11-24), and a drop stops a prompt command
 * before it renders. Prompts from plugins, tasks and peers pass, as nobody
 * pasted them.
 */
export function registerPromptSecrets(on: On): void {
	registerPromptLog(on);
	let held: string | undefined;
	on("prompt.submit", async ($, e, next) => {
		if (!TYPED.has(e.origin.kind)) {
			return next(e);
		}
		const again = held === e.text;
		held = undefined;
		if (again || !holdsSecret(e.text, await maskFor($, e.text))) {
			return next(e);
		}
		held = e.text;
		return { drop: HELD };
	}).catch(($, e, next) => {
		fault($, "prompt secret check", next.error);
		if (next.called || held === e.text || !holdsSecret(e.text, (t) => t)) {
			held = undefined;
			return next(e);
		}
		held = e.text;
		return { drop: HELD };
	});
}
