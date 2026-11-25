import type { On } from "claude-code";
import {
	describe,
	expect,
	mock,
	test,
	type TestBody
} from "claude-code/testing";

const CUT =
	"API Error: Connection lost mid-response. The response above may be incomplete.";

const watch = (on: On, surfaces: readonly "terminal"[] = ["terminal"]) => {
	const sent: string[] = [];
	const submitted: string[] = [];
	on("classic.StopFailure", () => ({}));
	on("classic.Stop", () => ({}));
	on("session.surfaces", () => ({ value: surfaces }));
	on("ui.notify", (_$, e) => {
		sent.push(e.text);
		return { value: { isSent: true, channel: "terminal_bell" } };
	});
	on("turn.complete", (_$, e) => ({ text: e.answer }));
	on("ui.log", () => ({ value: undefined }));
	on("prompt.submit", (_$, e) => {
		submitted.push(e.text);
		return { text: e.text };
	});
	// The clock's settle lets the unawaited continuation land.
	const { settle } = mock.clock(on);
	return { sent, submitted, settle };
};

const ERROR_END = {
	answer: "",
	durationMs: 1,
	isAborted: false,
	turnId: "t1",
	reason: "error"
} as const;

const cutTurn = async ($: Parameters<TestBody>[0]) => {
	await $.classic.StopFailure({
		error: "server_error",
		last_assistant_message: CUT
	});
	await $.turn.complete(ERROR_END);
};

describe("stop notice", () => {
	test("an API-error stop notifies once with the error", async ($, on) => {
		// Arrange
		const { sent, submitted } = watch(on);

		// Act
		await $.classic.StopFailure({
			error: "rate_limit",
			error_details: "529 overloaded"
		});

		// Assert
		expect(sent.length).toBe(1);
		expect(sent[0]).toContain("rate_limit");
		expect(sent[0]).toContain("529 overloaded");
		expect(submitted.length).toBe(0);
	});

	test("a normal stop notifies nothing", async ($, on) => {
		// Arrange
		const { sent } = watch(on);

		// Act
		await $.classic.Stop({ stop_hook_active: false });

		// Assert
		expect(sent.length).toBe(0);
	});

	test("a cut mid-response in a drawn session submits one continuation instead of a notice", async ($, on) => {
		// Arrange
		const { sent, submitted, settle } = watch(on);

		// Act
		await cutTurn($);
		await settle();

		// Assert
		expect(submitted).toHaveLength(1);
		expect(submitted[0]?.trim()).not.toBe("");
		expect(sent.length).toBe(0);
	});

	test("a third cut in a row notifies, so a dead link never loops", async ($, on) => {
		// Arrange
		const { sent, submitted, settle } = watch(on);

		// Act
		await cutTurn($);
		await cutTurn($);
		await cutTurn($);
		await settle();

		// Assert
		expect(submitted.length).toBe(2);
		expect(sent.length).toBe(1);
	});

	test("a cut in a -p run is left to core's own recovery", async ($, on) => {
		// Arrange
		const { sent, submitted, settle } = watch(on, []);

		// Act
		await cutTurn($);
		await settle();

		// Assert
		expect(submitted.length).toBe(0);
		expect(sent.length).toBe(1);
	});
});
