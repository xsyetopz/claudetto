// The helpers that the text of each segment shares: the number check and the error mark.

import { ICON } from "./icons.ts";
import type { Status } from "./types.ts";

export type Paint = Status["paint"];
export type Text = string | undefined;

export const isNumber = (value: unknown): value is number =>
	typeof value === "number" && Number.isFinite(value);

/** The mark of a field with a wrong type, after `icon` when there is one. */
export const errorMark = (paint: Paint, icon = ""): string =>
	paint.limit(`${icon} ${ICON.error}`.trim());
