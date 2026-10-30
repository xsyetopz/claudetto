import type { On } from "claude-code";
import { type Engine, expect, mock, test } from "claude-code/testing";
import { HANDOFF_DIR } from "../../src/blocks/handoff/handoff.ts";
import { STALE_MS, sourceLine } from "../../src/blocks/handoff/read-back.ts";

const DAY_MS = 86_400_000;

const OLDER = "handoff-2026-10-29T08-00-00.md";

const NEWER = "handoff-2026-10-29T09-00-00.md";

const BUILT = `# Handoff

Built by claudetto from the transcript, with no model call.
`;

const WRITTEN = `# Handoff

## Goal

Ship the read-back.
`;

interface Line {
	readonly text: string;
	readonly to: string;
}

/** `mtimeMs` 0 makes the clock's `now` the age of every handoff. */
const listed = (name: string) => ({
	name,
	kind: "file" as const,
	size: name.length,
	mtimeMs: 0,
	isLink: false,
});

/** The submit runs from a timer, so a case starts the timer and then settles the clock. */
const lab = (
	on: On,
	files: Readonly<Record<string, string>>,
	now = 0,
	refuse = false,
): {
	sent: readonly string[];
	lines: readonly Line[];
	settle: () => Promise<void>;
} => {
	const sent: string[] = [];
	const lines: Line[] = [];
	const clock = mock.clock(on, { now });
	mock.store(on);
	on("session.root", () => ({ value: "/repo" }));
	// The event carries the path resolved against the working directory, so match inside it.
	on("fs.exists", (_$, e) => ({
		value: e.path.replaceAll("\\", "/").endsWith(HANDOFF_DIR),
	}));
	on("fs.list", () => ({ value: Object.keys(files).map(listed) }));
	on("fs.read", (_$, e) => ({
		value: files[e.path.split("/").at(-1) ?? ""] ?? "",
	}));
	on("prompt.submit", (_$, e) => {
		if (refuse) {
			throw new Error("prompt.submit is refused in SessionStart");
		}
		sent.push(e.text);
		return { text: e.text };
	});
	on("ui.log", (_$, e) => {
		lines.push({ text: e.text, to: e.to });
		return { value: undefined };
	});
	on("classic.SessionStart", () => ({}));
	return { sent, lines, settle: () => clock.settle() };
};

test("a session after a clear takes the newest handoff in once", async ($: Engine, on: On) => {
	const { sent, settle } = lab(on, { [OLDER]: BUILT, [NEWER]: WRITTEN });

	await $.classic.SessionStart({ source: "clear" });
	await settle();

	expect(sent).toHaveLength(1);
	expect(sent[0]).toContain("Ship the read-back.");
	expect(sent[0]).toContain(`\`${HANDOFF_DIR}/${NEWER}\``);
});

test("the injected text opens with the source of the file", async ($: Engine, on: On) => {
	const { sent, settle } = lab(on, { [OLDER]: BUILT });

	await $.classic.SessionStart({ source: "clear" });
	await settle();

	expect(sent[0]?.startsWith(sourceLine(BUILT))).toBe(true);
});

test("a second start of the same session takes nothing in again", async ($: Engine, on: On) => {
	const { sent, settle } = lab(on, { [NEWER]: WRITTEN });

	await $.classic.SessionStart({ source: "clear" });
	await $.classic.SessionStart({ source: "clear" });
	await settle();

	expect(sent).toHaveLength(1);
});

test("a file newer than the one taken is taken in as well", async ($: Engine, on: On) => {
	const files: Record<string, string> = { [OLDER]: BUILT };
	const { sent, settle } = lab(on, files);

	await $.classic.SessionStart({ source: "resume" });
	await settle();
	files[NEWER] = WRITTEN;
	await $.classic.SessionStart({ source: "clear" });
	await settle();

	expect(sent).toHaveLength(2);
	expect(sent[1]).toContain("Ship the read-back.");
});

test("a session that starts fresh takes nothing in", async ($: Engine, on: On) => {
	const { sent, settle } = lab(on, { [NEWER]: WRITTEN });

	await $.classic.SessionStart({ source: "startup" });
	await settle();

	expect(sent).toEqual([]);
});

// File age is the clock's `now`, because every listed entry reports `mtimeMs` 0.
test("a handoff past the stale limit is named and not taken in", async ($: Engine, on: On) => {
	const { sent, lines, settle } = lab(
		on,
		{ [NEWER]: WRITTEN },
		STALE_MS + 2 * DAY_MS,
	);

	await $.classic.SessionStart({ source: "clear" });
	await settle();

	expect(sent).toEqual([]);
	expect(lines).toHaveLength(1);
	expect(lines[0]?.text).toContain(NEWER);
});

test("a handoff inside the stale limit is still taken in", async ($: Engine, on: On) => {
	const { sent, settle } = lab(on, { [NEWER]: WRITTEN }, STALE_MS - DAY_MS);

	await $.classic.SessionStart({ source: "clear" });
	await settle();

	expect(sent).toHaveLength(1);
});

test("a stale handoff is named once and not at every start", async ($: Engine, on: On) => {
	const { lines, settle } = lab(on, { [NEWER]: WRITTEN }, STALE_MS + DAY_MS);

	await $.classic.SessionStart({ source: "clear" });
	await $.classic.SessionStart({ source: "clear" });
	await settle();

	expect(lines).toHaveLength(1);
});

test("a project with no handoff folder yet takes nothing in and shows no error", async ($: Engine, on: On) => {
	const lines: string[] = [];
	mock.store(on);
	on("session.root", () => ({ value: "/repo" }));
	on("fs.exists", () => ({ value: false }));
	on("ui.log", (_$, e) => {
		lines.push(e.text);
		return { value: undefined };
	});
	on("classic.SessionStart", () => ({}));

	await $.classic.SessionStart({ source: "clear" });

	expect(lines).toEqual([]);
});

test("a submit the session refuses tells the user in one line", async ($: Engine, on: On) => {
	const { sent, lines, settle } = lab(on, { [NEWER]: WRITTEN }, 0, true);

	await $.classic.SessionStart({ source: "clear" });
	await settle();

	expect(sent).toEqual([]);
	expect(lines).toHaveLength(1);
	expect(lines[0]?.to).toBe("transcript");
});

test("a handoff file that cannot be read tells the user in one line", async ($: Engine, on: On) => {
	const lines: Line[] = [];
	mock.clock(on, { now: 0 });
	mock.store(on);
	on("session.root", () => ({ value: "/repo" }));
	on("fs.exists", () => ({ value: true }));
	on("fs.list", () => ({ value: [listed(NEWER)] }));
	on("fs.read", () => {
		throw new Error("EIO: the handoff could not be read");
	});
	on("ui.log", (_$, e) => {
		lines.push({ text: e.text, to: e.to });
		return { value: undefined };
	});
	on("classic.SessionStart", () => ({}));

	await $.classic.SessionStart({ source: "resume" });

	expect(lines).toHaveLength(1);
	expect(lines[0]?.to).toBe("transcript");
});
