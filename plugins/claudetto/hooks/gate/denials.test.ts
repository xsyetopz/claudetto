import { expect, test } from "claude-code/testing";

import { gateRepeated, gateRepeatedUnexplained } from "../texts-gate.ts";
import { repeatedText, signature, withDenial } from "./denials.ts";

test("a call with no JSON form still has a signature", () => {
	expect(signature("Bash")).toBe("Bash\0");
	expect(signature("Bash", { a: 1 })).toBe('Bash\0{"a":1}');
});

for (const [reason, unexplained] of [
	["", true],
	["   ", true],
	["\n", true],
	["(it gave no explanation)", true],
	["blocked", false],
	["not allowed here", false],
] as const) {
	const title = `a repeated denial with reason ${JSON.stringify(reason)} is ${unexplained ? "unexplained" : "explained"}`;
	const wanted = unexplained
		? gateRepeatedUnexplained(2, "ls")
		: gateRepeated(2, reason);
	test(title, () => {
		const held = withDenial(withDenial({}, "k", reason), "k", reason);
		expect(repeatedText(held, "k", "ls")).toBe(wanted);
	});
}
