import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

const lab = (on: On): { text: string; title: string | undefined }[] => {
	const notices: { text: string; title: string | undefined }[] = [];
	on("ui.notify", (_$, e) => {
		notices.push({ text: e.text, title: e.title });
		return { value: { isSent: true, channel: "terminal_bell" } };
	});
	on("classic.StopFailure", () => ({}));
	return notices;
};

test("a stop that an error ended raises one notice naming the error", async ($: Engine, on: On) => {
	const notices = lab(on);

	await $.classic.StopFailure({ error: "rate_limit" });

	expect(notices).toHaveLength(1);
	expect(notices[0]?.text).toContain("rate_limit");
});

test(
	"notificationsEnabled false raises none",
	{ options: { notificationsEnabled: false } },
	async ($: Engine, on: On) => {
		const notices = lab(on);

		await $.classic.StopFailure({ error: "rate_limit" });

		expect(notices).toEqual([]);
	},
);

test("a Notification raises no notice of its own", async ($: Engine, on: On) => {
	const notices = lab(on);
	on("classic.Notification", () => ({}));

	await $.classic.Notification({
		message: "Claude needs permission",
		notification_type: "permission_prompt",
	});

	expect(notices).toEqual([]);
});
