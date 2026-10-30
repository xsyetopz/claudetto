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
import { type Card, parseExplanation } from "./cards.ts";
import { type ButtonKey, type Choice, choicesOf } from "./choices.ts";
import { BORROWED } from "./constants.ts";
import type { View } from "./rows.ts";

export interface Table {
	readonly Box: ElementConstructor<BoxProps>;
	readonly Text: ElementConstructor<TextProps>;
	readonly Button: ElementConstructor<ButtonProps>;
	readonly Code: ElementConstructor<CodeProps>;
}

export interface Drawing {
	readonly surface: RenderSurface;
	readonly view: View;
	readonly tag: string;
	readonly press: (key: ButtonKey) => void;
}

/** The rebuild's own glyph: an asterisk is one cell wide on every terminal. */
const MARKER = "*";

const MIDDLE_DOT = " · ";

const COLUMN = "column";

const ROW = "row";

/** A surface with a composer of its own has no digit keys to arm, and no marker column. */
const hasOwnComposer = (surface: RenderSurface): boolean =>
	surface !== "terminal";

const choiceOf = (t: Table, d: Drawing, choice: Choice): RenderElement => {
	const keys: Partial<ButtonProps> = hasOwnComposer(d.surface)
		? {}
		: { hotkey: choice.hotkey, plain: true };
	return t.Box({
		marginRight: BORROWED.CHOICE_GAP,
		children: t.Button({
			...keys,
			key: choice.key,
			label: choice.label,
			...(choice.key === "dismiss" ? { role: "dismiss" } : {}),
			onPress: () => d.press(choice.key),
		}),
	});
};

const choicesRow = (t: Table, d: Drawing): RenderElement =>
	t.Box({
		flexDirection: ROW,
		flexWrap: "wrap",
		marginLeft: BORROWED.STAR_CELLS,
		children: choicesOf(d.view).map((choice) => choiceOf(t, d, choice)),
	});

const headOf = (t: Table, d: Drawing): RenderElement => {
	const lead = t.Text({
		dimColor: true,
		children: `${d.tag}${MIDDLE_DOT}`,
	});
	const marker = hasOwnComposer(d.surface)
		? []
		: [
				t.Box({
					width: BORROWED.STAR_CELLS,
					flexShrink: 0,
					children: MARKER,
				}),
			];
	return t.Box({
		flexDirection: ROW,
		children: [
			...marker,
			t.Text({
				children: [lead, d.view.line.slice(0, BORROWED.MAX_LINE_WIDTH)],
			}),
		],
	});
};

/** An empty line is one space, so the block keeps its shape. */
const sketchOf = (t: Table, card: Card): RenderNode | false =>
	card.sketch.length > 0 &&
	t.Code({
		source: card.sketch.map((line) => (line === "" ? " " : line)).join("\n"),
		language: "text",
	});

const cardOf = (t: Table, card: Card): RenderElement =>
	t.Box({
		flexDirection: COLUMN,
		marginBottom: 1,
		marginLeft: BORROWED.STAR_CELLS,
		children: [
			t.Text({ bold: true, children: card.title }),
			card.lead !== "" && t.Text({ children: card.lead }),
			sketchOf(t, card),
			card.caption !== "" && t.Text({ children: card.caption }),
		],
	});

const bodyOf = (t: Table, d: Drawing): readonly RenderNode[] => {
	switch (d.view.kind) {
		case "asked":
			return [
				t.Box({
					marginLeft: BORROWED.STAR_CELLS,
					children: t.Text({ dimColor: true, children: "Dismissed." }),
				}),
			];
		case "explained":
			return parseExplanation(d.view.explanation).map((card) =>
				cardOf(t, card),
			);
		default:
			return [];
	}
};

export const drawView = (t: Table, d: Drawing): RenderElement => {
	const spaced = d.view.kind === "explained" ? { marginBottom: 1 } : {};
	return t.Box({
		flexDirection: COLUMN,
		marginTop: BORROWED.OFFER_MARGIN_ROWS,
		children: [
			d.view.kind === "asked"
				? false
				: t.Box({ ...spaced, children: headOf(t, d) }),
			...bodyOf(t, d),
			choicesRow(t, d),
		],
	});
};
