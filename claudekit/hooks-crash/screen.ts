// What an interactive `claude` screen is waiting for, so a driver knows when to answer and when to type.

export type ScreenState =
	| "trust"
	| "trust-move"
	| "asking"
	| "busy"
	| "idle"
	| "starting";

/** A permission question puts its choices right under it, the first one chosen. */
const ASKING = /Do you want to [^\n]*\?\s*\n\s*❯ 1\. /;

const TRUST_CHOSEN = /❯ (\d\. )?Yes, I trust/;

/** A running turn's spinner, such as `Slithering… (19s · ↓ 776 tokens)`; a finished turn says `Worked for 1s` instead. */
const SPINNER = /… \(\d+[smh]/;

/** A main thread whose turn ended still works while its background agents run, and a prompt typed then lands mid-work. */
const AGENTS_WAIT = /Waiting for \d+ background agents? to finish/;

/** The trust dialog and a permission question also draw `❯`, so they are told apart first; a running turn shows its spinner. */
export const screenState = (screen: string): ScreenState => {
	if (screen.includes("Yes, I trust this folder")) {
		// The dialog opens on `No, exit`, so a bare Enter would quit.
		return TRUST_CHOSEN.test(screen) ? "trust" : "trust-move";
	}
	if (ASKING.test(screen)) {
		return "asking";
	}
	if (
		SPINNER.test(screen) ||
		AGENTS_WAIT.test(screen) ||
		screen.includes("esc to interrupt")
	) {
		return "busy";
	}
	return screen.includes("❯") ? "idle" : "starting";
};
