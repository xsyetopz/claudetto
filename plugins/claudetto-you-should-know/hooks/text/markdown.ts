/** Turns a card's prose into literal markdown: structure characters are escaped, lists are kept. */

export const HARD_BREAK = "  \n";
export const LIST_MARKER = /^(?:[-*+•]|(\d+)([.)]))\s+/u;
export const LEADING_NUMBER = /^(\d+)([.)])(?=\s|$)/u;
const MARKUP =
	/\*\*([^*\n]+?)\*\*|`([^`\n]+)`|[\\`*_{}[<>#+\-=|~^$&:@]|(?<=[wW]{3})\./gu;
export const STRUCTURAL = /[\\`*_{}[<>#+\-=|~^$&:@]|(?<=[wW]{3})\./gu;

export const literal = (text: string): string =>
	text
		.trimStart()
		.replaceAll(
			MARKUP,
			(whole, code: string | undefined, bold: string | undefined) => {
				const isBold = bold !== undefined;
				const isCode = code !== undefined;
				const strong = `**${(code ?? "").replaceAll(STRUCTURAL, String.raw`\$&`)}**`;
				if (isBold) {
					return whole;
				}
				if (isCode) {
					return strong;
				}
				return `\\${whole}`;
			}
		)
		.replace(LEADING_NUMBER, String.raw`$1\$2`);

export interface Shape {
	readonly kind: "plain" | "bullet" | "ordered";
	readonly text: string;
	readonly canOpenInPlace: boolean;
	readonly ordinal?: number;
}

export function lineShape(
	line: string,
	previousOrdinal: number | undefined
): Shape {
	const trimmed = line.trimStart();
	const marker = LIST_MARKER.exec(trimmed);
	const rest = literal(trimmed.slice(marker?.[0].length ?? 0));
	const digits = marker?.[1];
	const ordinal = Number(digits);
	const isNext =
		`${(previousOrdinal ?? ordinal - 1) + 1}.` === `${digits}${marker?.[2]}`;
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
			ordinal
		};
	}
	return {
		kind: "plain",
		text: `${digits}\\${marker[2]} ${rest}`,
		canOpenInPlace: false
	};
}

const softGap = (joins: boolean): string => (joins ? "\n" : "\n\n");

export function drawnLine(line: string, previous: Shape | undefined): Shape {
	const shape = lineShape(line, previous?.ordinal);
	const isPlain = shape.kind === "plain";
	const bothPlain = isPlain && previous?.kind === "plain";
	const joins =
		(!isPlain && shape.kind === previous?.kind) || shape.canOpenInPlace;
	const gap = bothPlain ? HARD_BREAK : softGap(joins);
	if (previous === undefined) {
		return shape;
	}
	return { ...shape, text: `${gap}${shape.text}` };
}

export function proseMarkdown(text: string, title: string): string {
	const head =
		title === "" ? "" : `**${title.replaceAll(STRUCTURAL, String.raw`\$&`)}**`;
	const seed: Shape[] =
		head === "" ? [] : [{ kind: "plain", text: head, canOpenInPlace: false }];
	const shapes = seed;
	for (const line of text.split("\n")) {
		if (line !== "") {
			shapes.push(drawnLine(line, shapes.at(-1)));
		}
	}
	const body = shapes.map((shape) => shape.text).join("");
	return body === "" ? "" : `${body}\n\n`;
}
