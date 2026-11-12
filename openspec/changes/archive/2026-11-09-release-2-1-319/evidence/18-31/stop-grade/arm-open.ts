// The installed grader text with `narrates` widened to steps listed as open that the assistant could still take.
import {
	GRADE_FAULTS,
	VERIFY_GRADE,
} from "../../../../../../plugins/claudetto/hooks/texts.ts";

(GRADE_FAULTS.narrates as { test: string }).test =
	'The reply ends on a step it promises ("Next I\'ll…", "I\'m now making…") in place of a result, or lists as open, left, or remaining a step the assistant could still take with its own tools (a command, test, check, edit, or commit), so the turn ends with the work undone. Not this fault: an open item that waits on the user, a denial, a paid run that needs approval, or a user message that said to leave it.';

export { VERIFY_GRADE };
