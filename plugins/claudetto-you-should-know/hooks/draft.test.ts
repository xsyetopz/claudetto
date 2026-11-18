import { expect, test } from "claude-code/testing";

import { foldReferencePlaceholders } from "./draft";

test("reference placeholders fold to a full-width bracket without backticks, as in Claude Code 2.1.327", () => {
	expect(foldReferencePlaceholders("[Pasted text #1 +3 lines] [Image #2] [...Truncated text #4...] [✦ Team setup guide #9]")).toBe(
		"［Pasted text #1 +3 lines] ［Image #2] ［...Truncated text #4...] ［✦ Team setup guide #9]",
	);
});
