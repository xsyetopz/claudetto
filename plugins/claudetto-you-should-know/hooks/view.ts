import type {
	BoxProps,
	ButtonProps,
	CodeProps,
	ElementConstructor,
	RenderElement,
	RenderNode,
	RenderSurface,
	TextProps,
} from "claude-code";
import { type Card, LIMITS, parseCards, type View } from "./note.ts";
import { DISMISSED } from "./texts.ts";

export type ButtonKey =
	| "learn"
	| "know"
	| "dismiss"
	| "helpful"
	| "not-relevant"
	| "not-understood"
	| "understood"
	| "respond";

interface Choice {
	readonly key: ButtonKey;
	readonly label: string;
	readonly hotkey: string;
}

export interface Table {
	readonly Box: ElementConstructor<BoxProps>;
	readonly Text: ElementConstructor<TextProps>;
	readonly Button: ElementConstructor<ButtonProps>;
	readonly Code: ElementConstructor<CodeProps>;
}

const DISMISS: Choice = { key: "dismiss", label: "Dismiss", hotkey: "0" };

const ASKED: readonly Choice[] = [
	{ key: "helpful", label: "That was helpful", hotkey: "1" },
	{ key: "not-relevant", label: "Not relevant", hotkey: "2" },
	{ key: "not-understood", label: "Couldn’t understand", hotkey: "3" },
	DISMISS,
];

const EXPLAINED: readonly Choice[] = [
	{ key: "understood", label: "Understood", hotkey: "1" },
	{ key: "respond", label: "Chat in main session", hotkey: "2" },
	DISMISS,
];

export const hasCards = (view: View): boolean =>
	parseCards(view.explanation).length > 0;

const choicesOf = (view: View): readonly Choice[] => {
	if (view.kind === "asked") {
		return ASKED;
	}
	if (view.kind === "explained") {
		return EXPLAINED;
	}
	const know: Choice = { key: "know", label: "Knew this already", hotkey: "2" };
	return hasCards(view)
		? [{ key: "learn", label: "Learn more", hotkey: "1" }, know, DISMISS]
		: [know, DISMISS];
};

const cardOf = (t: Table, card: Card): RenderElement =>
	t.Box({
		flexDirection: "column",
		marginBottom: 1,
		children: [
			t.Text({ bold: true, children: card.title }),
			card.lead !== "" && t.Text({ children: card.lead }),
			card.sketch.length > 0 &&
				t.Code({
					source: card.sketch.map((l) => (l === "" ? " " : l)).join("\n"),
					language: "text",
				}),
			card.caption !== "" && t.Text({ children: card.caption }),
		],
	});

const bodyOf = (t: Table, view: View): readonly RenderNode[] => {
	if (view.kind === "asked") {
		return [t.Text({ dimColor: true, children: DISMISSED })];
	}
	return view.kind === "explained"
		? parseCards(view.explanation).map((card) => cardOf(t, card))
		: [];
};

export const drawView = (
	t: Table,
	input: {
		surface: RenderSurface;
		view: View;
		tag: string;
		press: (key: ButtonKey) => void;
	},
): RenderElement => {
	const { view } = input;
	const keys: Partial<ButtonProps> =
		input.surface === "terminal" ? { plain: true } : {};
	const marker =
		input.surface === "terminal"
			? [t.Box({ width: 2, flexShrink: 0, children: "*" })]
			: [];
	const head =
		view.kind !== "asked" &&
		t.Box({
			flexDirection: "row",
			marginBottom: view.kind === "explained" ? 1 : 0,
			children: [
				...marker,
				t.Text({
					children: [
						t.Text({ dimColor: true, children: `${input.tag} · ` }),
						view.line.slice(0, LIMITS.lineChars),
					],
				}),
			],
		});
	const choices = t.Box({
		flexDirection: "row",
		flexWrap: "wrap",
		children: choicesOf(view).map((choice) =>
			t.Box({
				marginRight: 3,
				children: t.Button({
					...keys,
					...(input.surface === "terminal" ? { hotkey: choice.hotkey } : {}),
					key: choice.key,
					label: choice.label,
					...(choice.key === "dismiss" ? { role: "dismiss" } : {}),
					onPress: () => input.press(choice.key),
				}),
			}),
		),
	});
	return t.Box({
		flexDirection: "column",
		marginTop: 1,
		children: [head, ...bodyOf(t, view), choices],
	});
};
