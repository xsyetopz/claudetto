// The content of an `Edit` call before it runs (spec `session-hygiene`, "Edit Ledger", scenario "Intent Before the Call").

import { expect, test } from "bun:test";
import { hash64 } from "../../../../plugins/claudetto/modules/project/domain/ledger.ts";
import { afterEdit } from "../../../../plugins/claudetto/modules/session/hygiene/domain/intent.ts";

test("`afterEdit` replaces the one match, and its hash is the hash of the result", () => {
	const text = afterEdit("a b c\n", "b", "x", false);
	expect(text).toBe("a x c\n");
	expect(hash64(text ?? "")).toBe(hash64("a x c\n"));
});

test("`afterEdit` replaces each match with `replace_all`", () => {
	expect(afterEdit("b a b", "b", "x", true)).toBe("x a x");
});

test("`afterEdit` keeps `$` patterns of the new text as they are", () => {
	expect(afterEdit("a b", "b", "$& $1", false)).toBe("a $& $1");
	expect(afterEdit("b b", "b", "$&", true)).toBe("$& $&");
});

test("`afterEdit` gives `null` for no match, an empty `old_string`, and many matches with no `replace_all`", () => {
	expect(afterEdit("a", "z", "x", false)).toBeNull();
	expect(afterEdit("a", "", "x", true)).toBeNull();
	expect(afterEdit("b b", "b", "x", false)).toBeNull();
});
