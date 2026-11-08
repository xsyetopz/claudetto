import type {
	ModelCompleteInput,
	On,
	PromptFilled,
	PromptOrigin,
	RenderSurface,
} from "claude-code";
import { type Engine, expect, mock, test } from "claude-code/testing";
import { blankRow, LIMITS, linesOf, type Row, rowsOf } from "./note.ts";

const PLUGIN = "claudetto-you-should-know";
const ON = { options: { sideCheckEnabled: true } };
const LINE = "Tests run in order.";

const USAGE = {
	input_tokens: 0,
	output_tokens: 0,
	cache_read_input_tokens: 0,
	cache_creation_input_tokens: 0,
} as const;

const offerReply = (line: string): string =>
	`learn: ${line}\ntag: You should know\nexplain: **A title**\nA body that says what it is.`;

interface Ground {
	surfaces?: readonly RenderSurface[];
	store?: Readonly<Record<string, unknown>>;
	box?: string;
	fill?: PromptFilled;
	fault?: boolean;
	answer?: string;
}

const openRow = (
	kind: "offer" | "asked" | "explained",
	explanation = "",
): Row => ({
	...blankRow("s1"),
	view: { kind, line: LINE, explanation, shownAt: 1000 },
	offeredTurn: "t0",
	askedTurn: "t0",
});

const CARD = "**Order**\nTests run top to bottom.";

const fixture = (on: On, ground: Ground = {}) => {
	const clock = mock.clock(on, { now: 1000 });
	const store = new Map<string, unknown>(Object.entries(ground.store ?? {}));
	const asked: ModelCompleteInput[] = [];
	const submitted: string[] = [];
	const fills: string[] = [];
	const toasts: string[] = [];
	let reply = "learn: none";
	on("store.get", (_$, e) => ({ value: store.get(e.key) }));
	on("store.set", (_$, e) => {
		store.set(e.key, structuredClone(e.value));
		return { value: undefined };
	});
	on("session.id", () => ({ value: "s1" }));
	on("session.surfaces", () => ({ value: ground.surfaces ?? ["terminal"] }));
	on("ui.invalidate", () => ({ value: undefined }));
	on("ui.render", () => ({ type: "Box" }));
	on("prompt.submit", (_$, e) => {
		if (e.origin.kind === "plugin") {
			submitted.push(e.text);
		}
		return { text: e.text };
	});
	on("prompt.read", () => ({ value: { text: ground.box ?? "", cursor: 0 } }));
	on("prompt.fill", (_$, e) => {
		fills.push(e.text);
		return ground.fill ?? { isFilled: true };
	});
	on("ui.toast", (_$, e) => {
		toasts.push(e.text);
		return { value: undefined };
	});
	on("session.end", (_$, e) => ({ sessionId: e.sessionId }));
	on("model.complete", (_$, e) => {
		asked.push(e);
		if (ground.fault === true) {
			throw new Error("model fault");
		}
		return { value: { isAnswered: true, text: reply, usage: USAGE } };
	});
	on("turn.step", async function* (_$, e) {
		yield { kind: "text", index: 0, text: "" };
		return {
			turnId: e.turnId,
			index: e.index,
			answer: ground.answer ?? "",
			toolUses: [],
			stopReason: "end_turn",
			usage: null,
		};
	});
	return {
		asked,
		clock,
		store,
		submitted,
		fills,
		toasts,
		answerWith: (text: string) => {
			reply = text;
		},
		row: () => rowsOf(store.get("sessions"))[0],
	};
};

type Fixture = ReturnType<typeof fixture>;

const typed = (
	$: Engine,
	text: string,
	origin: PromptOrigin = { kind: "composer" },
) => $.prompt.submit({ text, wait: false, origin });

const step = async (
	$: Engine,
	f: Fixture,
	at: { turnId: string; index: number; agentId?: string },
): Promise<void> => {
	for await (const _chunk of $.turn.step({
		turnId: at.turnId,
		index: at.index,
		model: "m",
		messageCount: 1,
		...(at.agentId === undefined ? {} : { agentId: at.agentId }),
	})) {
		// drained so the step finishes
	}
	await f.clock.settle();
};

const stepsTo = async (
	$: Engine,
	f: Fixture,
	turnId: string,
	last: number,
): Promise<void> => {
	await inOrder(
		Array.from({ length: last }, (_, n) => n + 1),
		(index) => step($, f, { turnId, index }),
	);
};

const startCheck = ($: Engine, turnId: string, index: number) =>
	$.turn.step({ turnId, index, model: "m", messageCount: 1 }).next();

const mountBand = (
	$: Engine,
	hasSurvey = false,
	surface: RenderSurface = "terminal",
) =>
	$.ui.mount({
		plugin: PLUGIN,
		surface,
		component: "AbovePrompt",
		props: {
			hasSurvey,
			isWorking: false,
			maxRows: 12,
			bodyColumns: 80,
			scroll: { offset: 0, bodyRows: 12 },
			view: {},
		},
	});

const inOrder = async <T>(
	items: readonly T[],
	run: (item: T) => Promise<unknown>,
): Promise<void> => {
	const [head, ...rest] = items;
	if (head !== undefined) {
		await run(head);
		await inOrder(rest, run);
	}
};

const BACKED_OFF = { ignored: 4, skips: 8 };

const pressed = async (
	$: Engine,
	on: On,
	kind: "offer" | "asked",
	key: string,
) => {
	const f = fixture(on, {
		store: { sessions: [openRow(kind)], ...BACKED_OFF },
	});
	await (await mountBand($)).press({ key });
	return f;
};

test("a new install with no option set makes no request and writes nothing", async ($: Engine, on: On) => {
	const f = fixture(on, { store: { sessions: [openRow("offer")] } });
	await typed($, "build the export");
	await stepsTo($, f, "t1", 12);
	expect(f.asked).toHaveLength(0);
	expect(f.store.size).toBe(1);
	expect(await (await mountBand($)).findAll({ type: "Button" })).toEqual([]);
});

test(
	"an old option name enabled: true leaves the observer off",
	{ options: { enabled: true } },
	async ($: Engine, on: On) => {
		const f = fixture(on);
		await stepsTo($, f, "t1", 12);
		expect(f.asked).toHaveLength(0);
	},
);

test(
	"a check runs at every sixth step and at no other",
	ON,
	async ($: Engine, on: On) => {
		const f = fixture(on);
		await stepsTo($, f, "t1", 5);
		expect(f.asked).toHaveLength(0);
		await stepsTo($, f, "t2", 12);
		expect(f.asked).toHaveLength(2);
	},
);

test(
	"a subagent step on a multiple of six starts no check",
	ON,
	async ($: Engine, on: On) => {
		const f = fixture(on);
		await step($, f, { turnId: "t1", index: 6, agentId: "a1" });
		expect(f.asked).toHaveLength(0);
	},
);

test(
	"no check runs on a surface that draws no band",
	ON,
	async ($: Engine, on: On) => {
		const f = fixture(on, { surfaces: ["vscode"] });
		await stepsTo($, f, "t1", 6);
		expect(f.asked).toHaveLength(0);
	},
);

test(
	"a desktop surface is checked like a terminal",
	ON,
	async ($: Engine, on: On) => {
		const f = fixture(on, { surfaces: ["desktop"] });
		await stepsTo($, f, "t1", 6);
		expect(f.asked).toHaveLength(1);
	},
);

test("no check runs while a view is open", ON, async ($: Engine, on: On) => {
	const f = fixture(on, { store: { sessions: [openRow("offer")] } });
	await stepsTo($, f, "t1", 12);
	expect(f.asked).toHaveLength(0);
});

test(
	"no check runs in a turn that already got an offer",
	ON,
	async ($: Engine, on: On) => {
		const row = { ...openRow("offer"), view: null, offeredTurn: "t1" };
		const f = fixture(on, { store: { sessions: [row] } });
		await step($, f, { turnId: "t1", index: 6 });
		expect(f.asked).toHaveLength(0);
	},
);

test(
	"a sixth step that arrives before the last check answered makes no second request",
	ON,
	async ($: Engine, on: On) => {
		const f = fixture(on);
		await startCheck($, "t1", 6);
		await startCheck($, "t1", 12);
		await f.clock.settle();
		expect(f.asked).toHaveLength(1);
	},
);

test(
	"five ignored offers in a row leave four check chances without a request",
	ON,
	async ($: Engine, on: On) => {
		const f = fixture(on, {
			store: { sessions: [openRow("offer")], ignored: 4 },
		});
		await typed($, "first");
		await typed($, "second");
		await step($, f, { turnId: "t2", index: 0 });
		expect(f.store.get("ignored")).toBe(5);
		expect(f.store.get("skips")).toBe(4);
		await inOrder([6, 12, 18, 24], (index) =>
			step($, f, { turnId: "t3", index }),
		);
		expect(f.asked).toHaveLength(0);
		await step($, f, { turnId: "t3", index: 30 });
		expect(f.asked).toHaveLength(1);
	},
);

test("the skips stop growing at 16", ON, async ($: Engine, on: On) => {
	const f = fixture(on, {
		store: { sessions: [openRow("offer")], ignored: 20 },
	});
	await typed($, "first");
	await typed($, "second");
	await step($, f, { turnId: "t2", index: 0 });
	expect(f.store.get("skips")).toBe(16);
});

test(
	"an offer ignored inside the free count leaves no skip",
	ON,
	async ($: Engine, on: On) => {
		const f = fixture(on, { store: { sessions: [openRow("offer")] } });
		await typed($, "first");
		await typed($, "second");
		await step($, f, { turnId: "t2", index: 0 });
		expect(f.store.get("ignored")).toBe(1);
		expect(f.store.get("skips")).toBe(0);
	},
);

test(
	"an offer survives the first prompt typed past it and is cleared by the second",
	ON,
	async ($: Engine, on: On) => {
		const f = fixture(on, { store: { sessions: [openRow("offer")] } });
		await typed($, "first");
		await step($, f, { turnId: "t2", index: 0 });
		expect(f.row()?.view?.kind).toBe("offer");
		await typed($, "second");
		await step($, f, { turnId: "t3", index: 0 });
		expect(f.row()?.view).toBeNull();
	},
);

test(
	"two prompts typed through the bridge clear the offer",
	ON,
	async ($: Engine, on: On) => {
		const f = fixture(on, { store: { sessions: [openRow("offer")] } });
		await typed($, "first", { kind: "bridge" });
		await typed($, "second", { kind: "bridge" });
		await step($, f, { turnId: "t2", index: 0 });
		expect(f.row()?.view).toBeNull();
	},
);

test(
	"prompts a plugin sends do not count as typed past an offer",
	ON,
	async ($: Engine, on: On) => {
		const f = fixture(on, { store: { sessions: [openRow("offer")] } });
		await typed($, "first", { kind: "plugin", name: "other" });
		await typed($, "second", { kind: "plugin", name: "other" });
		await step($, f, { turnId: "t2", index: 0 });
		expect(f.row()?.view?.kind).toBe("offer");
	},
);

test(
	"a skipped check chance spends one skip and the next chance runs",
	ON,
	async ($: Engine, on: On) => {
		const f = fixture(on, { store: { skips: 1 } });
		await step($, f, { turnId: "t1", index: 6 });
		expect(f.asked).toHaveLength(0);
		expect(f.store.get("skips")).toBe(0);
		await step($, f, { turnId: "t1", index: 12 });
		expect(f.asked).toHaveLength(1);
	},
);

test(
	"the asked view closing itself after 20 seconds leaves the count at three",
	ON,
	async ($: Engine, on: On) => {
		const f = fixture(on, { store: { sessions: [openRow("offer")] } });
		await (await mountBand($)).press({ key: "dismiss" });
		expect(f.row()?.view?.kind).toBe("asked");
		f.store.set("ignored", 3);
		f.store.set("skips", 1);
		await f.clock.advance(LIMITS.askedMs);
		expect(f.row()?.view).toBeNull();
		expect(f.store.get("ignored")).toBe(3);
		expect(f.store.get("skips")).toBe(1);
	},
);

test(
	"Dismiss on the asked view closes it and keeps the counts",
	ON,
	async ($: Engine, on: On) => {
		const f = await pressed($, on, "asked", "dismiss");
		expect(f.row()?.view).toBeNull();
		expect(f.store.get("ignored")).toBe(4);
		expect(f.store.get("skips")).toBe(8);
	},
);

test(
	"dismissing an offer opens the asked view and resets the counts",
	ON,
	async ($: Engine, on: On) => {
		const f = await pressed($, on, "offer", "dismiss");
		expect(f.row()?.view?.kind).toBe("asked");
		expect(f.store.get("ignored")).toBe(0);
		expect(f.store.get("skips")).toBe(0);
	},
);

test(
	"a check makes one request with the option model, effort, and 512 tokens",
	{
		options: {
			sideCheckEnabled: true,
			sideCheckModel: "claude-sonnet-5-5",
			sideCheckEffortLevel: "low",
		},
	},
	async ($: Engine, on: On) => {
		const f = fixture(on);
		await stepsTo($, f, "t1", 6);
		expect(f.asked).toHaveLength(1);
		expect(f.asked[0]?.model).toBe("claude-sonnet-5-5");
		expect(f.asked[0]?.effort).toBe("low");
		expect(f.asked[0]?.maxTokens).toBe(512);
	},
);

test(
	"a check without model options asks claude-haiku-5-5 at high effort, and an unknown effort falls back",
	{
		options: { sideCheckEnabled: true, sideCheckEffortLevel: "maximum" },
	},
	async ($: Engine, on: On) => {
		const f = fixture(on);
		await stepsTo($, f, "t1", 6);
		expect(f.asked[0]?.model).toBe("claude-haiku-5-5");
		expect(f.asked[0]?.effort).toBe("high");
	},
);

test(
	"the fixed instructions are the cached block and the body follows unmarked",
	ON,
	async ($: Engine, on: On) => {
		const f = fixture(on);
		await stepsTo($, f, "t1", 6);
		const blocks = f.asked[0]?.promptBlocks ?? [];
		expect(blocks).toHaveLength(2);
		expect(blocks[0]?.cache).toBe(true);
		expect(blocks[1]?.cache).toBeUndefined();
	},
);

test(
	"a log of more than eight entries sends the last eight, each cut to its bound",
	ON,
	async ($: Engine, on: On) => {
		const f = fixture(on);
		await inOrder([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], (n) =>
			typed($, `prompt-${n} ${"x".repeat(2000)}`),
		);
		await stepsTo($, f, "t1", 6);
		const body = f.asked[0]?.promptBlocks?.[1]?.text ?? "";
		const entries = body.split("Latest work:\n")[1]?.split("\n") ?? [];
		expect(entries).toHaveLength(LIMITS.logEntries);
		expect(entries[0]?.startsWith("person: prompt-3 ")).toBe(true);
		expect(entries.every((e) => e.length <= LIMITS.entryChars)).toBe(true);
		expect(entries.join("\n").length).toBeLessThanOrEqual(8000);
	},
);

test(
	"a check body lists the lines already shown and the lines the person knows",
	{
		options: { sideCheckEnabled: true },
	},
	async ($: Engine, on: On) => {
		const f = fixture(on, {
			store: { shown: ["Shown one."], known: ["Known one."] },
		});
		await stepsTo($, f, "t1", 6);
		const body = f.asked[0]?.promptBlocks?.[1]?.text ?? "";
		expect(body).toContain("- Shown one.");
		expect(body).toContain("- Known one.");
	},
);

test(
	"the log holds a typed prompt and a step's answer, and leaves out a plugin's prompt",
	ON,
	async ($: Engine, on: On) => {
		const f = fixture(on, { answer: "Dropped the table." });
		await typed($, "drop it");
		await typed($, "ignored", { kind: "plugin", name: "other" });
		await stepsTo($, f, "t1", 6);
		const body = f.asked[0]?.promptBlocks?.[1]?.text ?? "";
		expect(body).toContain("person: drop it\nassistant: Dropped the table.");
		expect(body).not.toContain("ignored");
	},
);

test(
	"the fixed instructions allow a line only for a consequence and name the Heads up tag",
	ON,
	async ($: Engine, on: On) => {
		const f = fixture(on);
		await stepsTo($, f, "t1", 6);
		const rules = f.asked[0]?.promptBlocks?.[0]?.text ?? "";
		expect(rules).toContain("Speak only when all of these hold");
		expect(rules).toContain("a real consequence");
		expect(rules).toContain("`Heads up`");
	},
);

test("a check never forks the session", ON, async ($: Engine, on: On) => {
	const f = fixture(on);
	const forks: unknown[] = [];
	on("model.fork", (_$, e) => {
		forks.push(e);
		return { deny: "no fork" };
	});
	await stepsTo($, f, "t1", 6);
	expect(f.asked).toHaveLength(1);
	expect(forks).toEqual([]);
});

for (const [name, text] of [
	["a reply that fails parsing", "no label here"],
	["a reply with an empty line", "learn:"],
	["a reply of none", "learn: none"],
] as const) {
	test(
		`${name} shows nothing and stores no shown line`,
		ON,
		async ($: Engine, on: On) => {
			const f = fixture(on);
			f.answerWith(text);
			await stepsTo($, f, "t1", 6);
			expect(f.asked).toHaveLength(1);
			expect(f.store.get("shown")).toBeUndefined();
			expect(f.row()?.view).toBeNull();
		},
	);
}

test(
	"a new line is shown and joins the shown list",
	ON,
	async ($: Engine, on: On) => {
		const f = fixture(on);
		f.answerWith(offerReply(LINE));
		await stepsTo($, f, "t1", 6);
		expect(f.store.get("shown")).toEqual([LINE]);
		expect(f.row()).toMatchObject({
			view: { kind: "offer" },
			offeredTurn: "t1",
		});
	},
);

test(
	"a line equal to a shown line except for case and final period shows nothing",
	ON,
	async ($: Engine, on: On) => {
		const f = fixture(on, { store: { shown: [LINE] } });
		f.answerWith(offerReply("TESTS RUN IN ORDER"));
		await stepsTo($, f, "t1", 6);
		expect(f.asked).toHaveLength(1);
		expect(f.store.get("shown")).toEqual([LINE]);
		expect(f.row()?.view).toBeNull();
	},
);

test(
	"a line equal to a known line except for case and final period shows nothing",
	ON,
	async ($: Engine, on: On) => {
		const f = fixture(on, { store: { known: ["tests run in order"] } });
		f.answerWith(offerReply(LINE));
		await stepsTo($, f, "t1", 6);
		expect(f.store.get("shown")).toBeUndefined();
		expect(f.row()?.view).toBeNull();
	},
);

const outcomeOf = (f: Fixture) => ({
	requests: f.asked.length,
	view: f.row()?.view ?? null,
	shown: f.store.get("shown"),
});

const NOTHING_SHOWN = { requests: 1, view: null, shown: undefined };

const lateReply = async (
	$: Engine,
	on: On,
	change: (f: Fixture) => Promise<unknown> | unknown,
) => {
	const f = fixture(on);
	f.answerWith(offerReply(LINE));
	await startCheck($, "t1", 6);
	await change(f);
	await f.clock.settle();
	return f;
};

test(
	"a reply that arrives after its turn changed shows nothing",
	ON,
	async ($: Engine, on: On) => {
		const f = await lateReply($, on, (m) =>
			m.store.set("sessions", [{ ...m.row(), askedTurn: "t2" }]),
		);
		expect(outcomeOf(f)).toEqual(NOTHING_SHOWN);
	},
);

test(
	"a reply that arrives after its session ended shows nothing",
	ON,
	async ($: Engine, on: On) => {
		const f = await lateReply($, on, () =>
			$.session.end({ reason: "other", sessionId: "s1", resume: { id: "s1" } }),
		);
		expect(outcomeOf(f)).toEqual(NOTHING_SHOWN);
	},
);

test(
	"a reply that arrives while a view is open leaves that view as it is",
	ON,
	async ($: Engine, on: On) => {
		const f = await lateReply($, on, (m) =>
			m.store.set("sessions", [{ ...openRow("asked"), askedTurn: "t1" }]),
		);
		expect(f.row()?.view?.kind).toBe("asked");
		expect(f.store.get("shown")).toBeUndefined();
	},
);

test(
	"an open offer is closed when its session ends",
	ON,
	async ($: Engine, on: On) => {
		const f = fixture(on, { store: { sessions: [openRow("offer")] } });
		await $.session.end({
			reason: "other",
			sessionId: "s1",
			resume: { id: "s1" },
		});
		expect(f.row()?.view).toBeNull();
	},
);

test(
	"a check fault is swallowed and the person sees nothing",
	ON,
	async ($: Engine, on: On) => {
		const f = fixture(on, { fault: true });
		await stepsTo($, f, "t1", 6);
		expect(f.asked).toHaveLength(1);
		expect(f.row()?.view).toBeNull();
	},
);

test(
	"a 33rd session row evicts a closed row first",
	ON,
	async ($: Engine, on: On) => {
		const rows = Array.from({ length: 32 }, (_, n) => ({
			...openRow("offer"),
			id: `r${n}`,
			...(n === 7 ? { view: null } : {}),
		}));
		const f = fixture(on, { store: { sessions: rows } });
		await step($, f, { turnId: "t1", index: 6 });
		const ids = rowsOf(f.store.get("sessions")).map((r) => r.id);
		expect(ids).toHaveLength(LIMITS.sessionsMax);
		expect(ids).toContain("s1");
		expect(ids).not.toContain("r7");
	},
);

test(
	"the shown list keeps its last 50 lines",
	ON,
	async ($: Engine, on: On) => {
		const shown = Array.from({ length: 50 }, (_, n) => `Line ${n}.`);
		const f = fixture(on, { store: { shown } });
		f.answerWith(offerReply("A new line."));
		await stepsTo($, f, "t1", 6);
		const kept = linesOf(f.store.get("shown"));
		expect(kept).toHaveLength(50);
		expect(kept.at(-1)).toBe("A new line.");
	},
);

test(
	"the known list keeps its last 50 lines",
	ON,
	async ($: Engine, on: On) => {
		const known = Array.from({ length: 50 }, (_, n) => `Line ${n}.`);
		const f = fixture(on, { store: { sessions: [openRow("offer")], known } });
		await (await mountBand($)).press({ key: "know" });
		const kept = linesOf(f.store.get("known"));
		expect(kept).toHaveLength(50);
		expect(kept.at(-1)).toBe(LINE);
	},
);

test(
	"Knew this already adds the line to the known list, closes the view, and resets the counts",
	ON,
	async ($: Engine, on: On) => {
		const f = await pressed($, on, "offer", "know");
		expect(f.store.get("known")).toEqual([LINE]);
		expect(f.row()?.view).toBeNull();
		expect(f.store.get("ignored")).toBe(0);
		expect(f.store.get("skips")).toBe(0);
	},
);

test(
	"That was helpful on the asked view learns the line and resets the counts",
	ON,
	async ($: Engine, on: On) => {
		const f = await pressed($, on, "asked", "helpful");
		expect(f.store.get("known")).toEqual([LINE]);
		expect(f.store.get("skips")).toBe(0);
	},
);

for (const key of ["not-relevant", "not-understood"]) {
	test(
		`the ${key} key closes the asked view, learns no line, and resets the counts`,
		ON,
		async ($: Engine, on: On) => {
			const f = await pressed($, on, "asked", key);
			expect(f.row()?.view).toBeNull();
			expect(f.store.get("known")).toBeUndefined();
			expect(f.store.get("ignored")).toBe(0);
			expect(f.store.get("skips")).toBe(0);
		},
	);
}

test(
	"Learn more opens the explanation with no second request",
	ON,
	async ($: Engine, on: On) => {
		const f = fixture(on, { store: { sessions: [openRow("offer", CARD)] } });
		await (await mountBand($)).press({ key: "learn" });
		expect(f.asked).toHaveLength(0);
		expect(f.row()?.view?.kind).toBe("explained");
	},
);

test(
	"an offer with no explanation shows Knew this already and Dismiss but no Learn more",
	ON,
	async ($: Engine, on: On) => {
		fixture(on, { store: { sessions: [openRow("offer")] } });
		const band = await mountBand($);
		expect(await band.find({ type: "Button", key: "learn" })).toBeUndefined();
		expect(await band.find({ type: "Button", key: "know" })).toBeDefined();
		expect(await band.find({ type: "Button", key: "dismiss" })).toBeDefined();
	},
);

test(
	"an offer with an explanation shows Learn more",
	ON,
	async ($: Engine, on: On) => {
		fixture(on, { store: { sessions: [openRow("offer", CARD)] } });
		const band = await mountBand($);
		expect(await band.find({ type: "Button", key: "learn" })).toBeDefined();
	},
);

test(
	"a band with no open view draws nothing of ours",
	ON,
	async ($: Engine, on: On) => {
		fixture(on);
		expect(await (await mountBand($)).findAll({ type: "Button" })).toEqual([]);
	},
);

test(
	"a band whose props say a survey is open draws nothing of ours",
	ON,
	async ($: Engine, on: On) => {
		fixture(on, { store: { sessions: [openRow("offer")] } });
		expect(
			await (await mountBand($, true)).findAll({ type: "Button" }),
		).toEqual([]);
	},
);

const DRAFT = `Here is a note offered by a side agent:

> You should know · ${LINE}
>
> **Order**
> Tests run top to bottom.`;

const explained = (on: On, ground: Ground = {}) =>
	fixture(on, {
		store: { sessions: [openRow("explained", CARD)], ...BACKED_OFF },
		...ground,
	});

test(
	"the explained view offers key 2 to chat in the main session",
	ON,
	async ($: Engine, on: On) => {
		explained(on);
		const chat = await (await mountBand($)).find({
			type: "Button",
			key: "respond",
		});
		expect(chat?.props).toMatchObject({
			label: "Chat in main session",
			hotkey: "2",
		});
	},
);

test(
	"chat puts the quoted note in an empty box, learns the line, closes, and resets the counts",
	ON,
	async ($: Engine, on: On) => {
		const f = explained(on);
		await (await mountBand($)).press({ key: "respond" });
		expect(f.fills).toEqual([`${DRAFT}\n\n`]);
		expect(f.submitted).toEqual([]);
		expect(f.store.get("known")).toEqual([LINE]);
		expect(f.row()?.view).toBeNull();
		expect(f.store.get("skips")).toBe(0);
	},
);

test(
	"chat leaves a box that holds text unchanged and a toast says to send or clear it",
	ON,
	async ($: Engine, on: On) => {
		const f = explained(on, { box: "half a prompt" });
		await (await mountBand($)).press({ key: "respond" });
		expect(f.fills).toEqual([]);
		expect(f.toasts).toEqual([
			"Your prompt box has text in it. Send or clear it, then press 2 again.",
		]);
		expect(f.row()?.view?.kind).toBe("explained");
		expect(f.store.get("skips")).toBe(8);
	},
);

test(
	"a refusal with no cause keeps the view open and offers a retry",
	ON,
	async ($: Engine, on: On) => {
		const f = explained(on, { fill: { isFilled: false, text: "", cursor: 0 } });
		await (await mountBand($)).press({ key: "respond" });
		expect(f.toasts).toEqual([
			"The prompt box didn't take the note. Press 2 to try again.",
		]);
		expect(f.row()?.view?.kind).toBe("explained");
		expect(f.submitted).toEqual([]);
	},
);

test(
	"an at-sign in the note becomes a full-width one in the chat draft",
	ON,
	async ($: Engine, on: On) => {
		const f = fixture(on, {
			store: { sessions: [openRow("explained", "**T**\nSee @file.")] },
		});
		await (await mountBand($)).press({ key: "respond" });
		expect(f.fills[0]).toContain("＠file");
		expect(f.fills[0]).not.toContain("@file");
	},
);

test(
	"the terminal band draws a marker column and digit keys, and the desktop band draws neither",
	ON,
	async ($: Engine, on: On) => {
		fixture(on, { store: { sessions: [openRow("offer")] } });
		const terminal = await mountBand($);
		const desktop = await mountBand($, false, "desktop");
		const marked = async (band: typeof terminal) =>
			(await band.findAll({ type: "Box" })).some((box) => box.text === "*");
		expect(await marked(terminal)).toBe(true);
		expect(await marked(desktop)).toBe(false);
		expect(
			(await terminal.find({ type: "Button", key: "know" }))?.props,
		).toMatchObject({ hotkey: "2" });
		expect(
			(await desktop.find({ type: "Button", key: "know" }))?.props,
		).not.toHaveProperty("hotkey");
	},
);

test(
	"a check body with empty lists and no log says none and nothing yet",
	ON,
	async ($: Engine, on: On) => {
		const f = fixture(on);
		await stepsTo($, f, "t1", 6);
		const body = f.asked[0]?.promptBlocks?.[1]?.text ?? "";
		expect(body).toContain("Lines already shown:\n(none)");
		expect(body).toContain("Latest work:\n(nothing yet)");
	},
);

test(
	"a check body stays within 8,000 characters with both lists and the log full",
	ON,
	async ($: Engine, on: On) => {
		const lines = (mark: string) =>
			Array.from({ length: 50 }, (_, n) => `${mark}${n} ${"x".repeat(230)}`);
		const f = fixture(on, {
			store: { shown: lines("s"), known: lines("k") },
		});
		await inOrder([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], (n) =>
			typed($, `prompt-${n} ${"x".repeat(2000)}`),
		);
		await stepsTo($, f, "t1", 6);

		const body = f.asked[0]?.promptBlocks?.[1]?.text ?? "";

		expect(body.length).toBeGreaterThan(0);
		expect(body.length).toBeLessThanOrEqual(8000);
	},
);
