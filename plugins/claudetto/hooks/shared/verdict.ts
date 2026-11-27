/** The fields of a `tool.check` verdict that name who made its ask. */
interface AskSource {
	decision: string;
	rule?: string | undefined;
	setting?: string | undefined;
	hook?: string | undefined;
	plugin?: string | undefined;
}

/**
 * Whether a verdict is the permission mode's own ask: no rule, setting, hook
 * or plugin made it, so the mode settles it (auto mode's classifier, the
 * default mode's dialog). A hook that returns such an ask as its own answer
 * turns it into a person's ask, which skips auto mode and opens a dialog.
 */
export const isModesAsk = (verdict: AskSource): boolean =>
	verdict.decision === "ask" &&
	verdict.rule === undefined &&
	verdict.setting === undefined &&
	verdict.hook === undefined &&
	verdict.plugin === undefined;
