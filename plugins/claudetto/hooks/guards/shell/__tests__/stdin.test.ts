import { describe, expect, test } from "claude-code/testing";

import { closeStdin } from "../stdin";

describe("stdin guard", () => {
	test("reads stdin from /dev/null and keeps a heredoc intact", () => {
		// Act and Assert
		expect(closeStdin("cat <<EOF\nhi\nEOF")).toBe(
			"{ cat <<EOF\nhi\nEOF\n} </dev/null"
		);
	});
});
