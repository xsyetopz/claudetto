import type { On } from "claude-code";
import { describe, expect, test } from "claude-code/testing";

interface Setup {
	channel?: string;
	env?: Readonly<Record<string, string>>;
	failing?: readonly string[];
}

/** Serves a wait notice on a machine with `setup`'s setting and terminal; returns the commands run and the terminal sends. */
const serve = (on: On, setup: Setup = {}) => {
	const runs: string[][] = [];
	const sends: string[] = [];
	on("classic.Notification", () => ({}));
	on("settings.read", () => ({
		value:
			setup.channel === undefined
				? {}
				: { preferredNotifChannel: setup.channel }
	}));
	on("env.get", (_$, e) => ({ value: setup.env?.[e.name] }));
	on("ui.notify", (_$, e) => {
		sends.push(e.text);
		return { value: { isSent: true, channel: "iterm2" } };
	});
	on("ui.log", () => ({ value: undefined }));
	on("process.run", (_$, e) => {
		runs.push([...e.argv]);
		return {
			value: {
				exitCode: setup.failing?.includes(e.argv[0] ?? "") === true ? 127 : 0,
				stdout: "",
				stderr: "",
				isStdoutTruncated: false,
				isStderrTruncated: false
			}
		};
	});
	return { runs, sends };
};

const wait = (type: string, message: string) =>
	({ message, notification_type: type }) as const;

describe("native notice for a wait on the user", () => {
	test("a permission dialog on a terminal with no channel raises a banner naming the permission", async ($, on) => {
		// Arrange
		const { runs } = serve(on, { env: { TERM_PROGRAM: "Apple_Terminal" } });

		// Act
		await $.classic.Notification(
			wait("permission_prompt", "Claude needs your permission")
		);

		// Assert
		expect(runs.length).toBe(1);
		expect(runs[0]?.[0]).toBe("osascript");
		expect(runs[0]?.at(-1)).toContain("needs your permission");
	});

	test("the idle wait reaches Linux through notify-send when osascript is missing", async ($, on) => {
		// Arrange
		const { runs } = serve(on, { failing: ["osascript"] });

		// Act
		await $.classic.Notification(
			wait("idle_prompt", "Claude is waiting for your input")
		);

		// Assert
		expect(runs.map((argv) => argv[0])).toEqual(["osascript", "notify-send"]);
		expect(runs[1]?.at(-1)).toContain("waiting for your input");
	});

	test("an elicitation dialog raises a banner too", async ($, on) => {
		// Arrange
		const { runs } = serve(on);

		// Act
		await $.classic.Notification(
			wait("elicitation_dialog", "Claude Code needs your input")
		);

		// Assert
		expect(runs.length).toBe(1);
	});

	test("a bell-only setting gets the banner, since the bell shows no text", async ($, on) => {
		// Arrange
		const { runs } = serve(on, {
			channel: "terminal_bell",
			env: { TERM_PROGRAM: "iTerm.app" }
		});

		// Act
		await $.classic.Notification(
			wait("permission_prompt", "Claude needs your permission")
		);

		// Assert
		expect(runs.length).toBe(1);
	});

	test("a terminal that shows the text itself gets no second notice", async ($, on) => {
		// Arrange
		const { runs, sends } = serve(on, { env: { TERM_PROGRAM: "iTerm.app" } });

		// Act
		await $.classic.Notification(
			wait("permission_prompt", "Claude needs your permission")
		);

		// Assert
		expect(runs.length).toBe(0);
		expect(sends.length).toBe(0);
	});

	test("notifications_disabled gets nothing", async ($, on) => {
		// Arrange
		const { runs } = serve(on, { channel: "notifications_disabled" });

		// Act
		await $.classic.Notification(
			wait("permission_prompt", "Claude needs your permission")
		);

		// Assert
		expect(runs.length).toBe(0);
	});

	test("a notification that is not a wait on the user gets no banner", async ($, on) => {
		// Arrange
		const { runs } = serve(on);

		// Act
		await $.classic.Notification(wait("auth_success", "Logged in"));
		await $.classic.Notification(wait("plugin_notification", "from a mod"));

		// Assert
		expect(runs.length).toBe(0);
	});
});
