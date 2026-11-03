import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import { unblockedItems } from "../../src/blocks/run-limits/open-items.ts";

const lab = (on: On): void => {
	on("classic.Stop", () => ({}));
};

const DOABLE = `The parser is fixed.

Still open:
- \`span.spec.ts\` fails after the fix.
- \`rank.spec.ts\` waits on your approval of its paid run.`;

test("an open item with no blocker beside it is listed", () => {
	expect(unblockedItems(DOABLE)).toEqual([
		"`span.spec.ts` fails after the fix.",
	]);
});

test("an open item that names its blocker is not listed", () => {
	const reply = `Done.

What's left:
1. \`rank.spec.ts\` needs a paid API key you have not approved.`;

	expect(unblockedItems(reply)).toEqual([]);
});

test("a reply with no open list lists nothing", () => {
	expect(
		unblockedItems(`All checks pass.
- \`a.ts\` changed.`),
	).toEqual([]);
});

test("a list after the open heading ends at the next heading", () => {
	const reply = `Remaining:
- \`x\` waits on your approval.

## Notes
- \`y\` changed.`;

	expect(unblockedItems(reply)).toEqual([]);
});

test("a Stop with an unblocked open item is blocked once, naming the item", async ($: Engine, on: On) => {
	lab(on);

	const out = await $.classic.Stop({
		stop_hook_active: false,
		last_assistant_message: DOABLE,
	});

	expect(out.block).toContain("span.spec.ts");
	expect(out.block).not.toContain("rank.spec.ts");
});

test("a Stop already continued by a hook is not blocked again", async ($: Engine, on: On) => {
	lab(on);

	const out = await $.classic.Stop({
		stop_hook_active: true,
		last_assistant_message: DOABLE,
	});

	expect(out.block).toBeUndefined();
});

test("a Stop whose open items all name a blocker passes", async ($: Engine, on: On) => {
	lab(on);

	const out = await $.classic.Stop({
		stop_hook_active: false,
		last_assistant_message: `Still open:
- \`rank.spec.ts\` waits on your approval.`,
	});

	expect(out.block).toBeUndefined();
});
