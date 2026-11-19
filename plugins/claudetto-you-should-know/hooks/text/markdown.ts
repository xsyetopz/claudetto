/** Turns a card's prose into literal markdown: structure characters are escaped, lists are kept. */

export const HARD_BREAK = "  \n";
export const LIST_MARKER = /^(?:[-*+•]|(\d+)([.)]))\s+/;
export const LEADING_NUMBER = /^(\d+)([.)])(?=\s|$)/;
const MARKUP =
	/\*\*([^*\n]+?)\*\*|`([^`\n]+)`|[\\`*_{}[<>#+\-=|~^$&:@]|(?<=[wW]{3})\./g;
export const STRUCTURAL = /[\\`*_{}[<>#+\-=|~^$&:@]|(?<=[wW]{3})\./g;

export const literal = (text: string): string =>
	text
		.trimStart()
		.replace(MARKUP, (whole, code: string | undefined, bold: string | undefined) => {
			const isBold = bold !== undefined;
			const isCode = code !== undefined;
			const strong = `**${(code ?? "").replace(STRUCTURAL, "\\$&")}**`;
			if (isBold) {
				return whole;
			}
			if (isCode) {
				return strong;
			}
			return `\\${whole}`;
		})
		.replace(LEADING_NUMBER, "$1\\$2");

export type Shape = {
	readonly kind: "plain" | "bullet" | "ordered";
	readonly text: string;
	readonly canOpenInPlace: boolean;
	readonly ordinal?: number;
};

export function lineShape(line: string, previousOrdinal: number | undefined): Shape {
	const trimmed = line.trimStart();
	const marker = LIST_MARKER.exec(trimmed);
	const rest = literal(trimmed.slice(marker?.[0].length ?? 0));
	const digits = marker?.[1];
	const ordinal = Number(digits);
	const isNext = `${(previousOrdinal ?? ordinal - 1) + 1}.` === `${digits}${marker?.[2]}`;
	if (marker === null) {
		return { kind: "plain", text: rest, canOpenInPlace: false };
	}
	if (digits === undefined) {
		return { kind: "bullet", text: `- ${rest}`, canOpenInPlace: true };
	}
	if (isNext) {
		return {
			kind: "ordered",
			text: `${ordinal}. ${rest}`,
			canOpenInPlace: ordinal === 1,
			ordinal,
		};
	}
	return {
		kind: "plain",
		text: `${digits}\\${marker[2]} ${rest}`,
		canOpenInPlace: false,
	};
}

export function drawnLine(line: string, previous: Shape | undefined): Shape {
	const shape = lineShape(line, previous?.ordinal);
	const isPlain = shape.kind === "plain";
	const bothPlain = isPlain && previous?.kind === "plain";
	const joins = (!isPlain && shape.kind === previous?.kind) || shape.canOpenInPlace;
	const gap = bothPlain ? HARD_BREAK : joins ? "\n" : "\n\n";
	if (previous === undefined) {
		return shape;
	}
	return { ...shape, text: `${gap}${shape.text}` };
}

export function proseMarkdown(text: string, title: string): string {
	const head = title === "" ? "" : `**${title.replace(STRUCTURAL, "\\$&")}**`;
	const seed: Shape[] =
		head !== "" ? [{ kind: "plain", text: head, canOpenInPlace: false }] : [];
	const body = text
		.split("\n")
		.filter((line) => line !== "")
		.reduce<Shape[]>((acc, line) => [...acc, drawnLine(line, acc.at(-1))], seed)
		.map((shape) => shape.text)
		.join("");
	return body === "" ? "" : `${body}\n\n`;
}
