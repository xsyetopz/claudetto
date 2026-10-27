// The context segment: the window in effect, the percent of it in use, and the part of the handoff trigger that is left.

import {
	HAIKU_HANDOFF_TRIGGER_TOKENS,
	HANDOFF_TRIGGER_TOKENS,
} from "../session/limits.ts";
import { windowText } from "./format.ts";
import { ICON } from "./icons.ts";
import { TRIGGER_WARN_FRACTION } from "./limits.ts";
import { errorMark, isNumber, type Paint, type Text } from "./marks.ts";
import { parseModel } from "./model.ts";
import type { Status } from "./types.ts";
import { windowInEffect } from "./window.ts";

/** The tokens in the window: the input, cache creation, and cache read tokens of `current_usage` (what `used_percentage` counts). Without them, the tokens that `used_percentage` is of `size`. */
const tokensInUse = (
	window: NonNullable<Status["input"]["context_window"]>,
	size: number | undefined,
): number | undefined => {
	const usage = window.current_usage;
	const counts = usage
		? [
				usage.input_tokens,
				usage.cache_creation_input_tokens,
				usage.cache_read_input_tokens,
			].filter(isNumber)
		: [];
	if (counts.length > 0) {
		return total(counts);
	}
	const used = window.used_percentage;
	return isNumber(used) && size !== undefined ? (used / 100) * size : undefined;
};

const total = (counts: number[]): number => {
	let sum = 0;
	for (const n of counts) {
		sum += n;
	}
	return sum;
};

/** The style of the handoff mark for `left` tokens of `trigger`: ok while far, limit at or past the trigger, else warn. */
const handoffStyle = (paint: Paint, left: number, trigger: number) => {
	if (left > trigger * TRIGGER_WARN_FRACTION) {
		return paint.ok;
	}
	return left <= 0 ? paint.limit : paint.warn;
};

/** ` ⇥47%`: the part of the handoff trigger that is left, or `""` without tokens. The trigger cannot be past the window. */
const handoffText = (
	{ input, paint, compaction }: Status,
	size: number | undefined,
	tokens: number | undefined,
): string => {
	if (tokens === undefined) {
		return "";
	}
	const family = parseModel(input.model?.id)?.family;
	const model =
		family === "haiku" ? HAIKU_HANDOFF_TRIGGER_TOKENS : HANDOFF_TRIGGER_TOKENS;
	const trigger = size === undefined ? model : Math.min(model, size);
	const left = trigger - tokens;
	const style = handoffStyle(paint, left, trigger);
	const mark = compaction ? ICON.compaction : ICON.handoff;
	return ` ${style(`${mark}${left <= 0 ? "now" : `${Math.round((left / trigger) * 100)}%`}`)}`;
};

/** `▤ ctx 40% of 300k ⇥45%`: the window in effect, the percent of it with the usage gradient, and the part of the handoff trigger that is left (the compaction threshold with `built-in`). The trigger cannot be past the window. */
export const contextText = (status: Status): Text => {
	const { input, paint, windows } = status;
	const window = input.context_window;
	const used = window?.used_percentage ?? undefined;
	if (!window || used === undefined) {
		return undefined;
	}
	if (!isNumber(used)) {
		return errorMark(paint, ICON.context);
	}
	const size = windowInEffect(
		windows,
		input.model?.id,
		window.context_window_size,
	);
	const tokens = tokensInUse(window, window.context_window_size);
	const percent =
		tokens !== undefined && size !== undefined
			? Math.min(100, Math.round((tokens / size) * 100))
			: Math.round(used);
	const of = size === undefined ? "" : ` of ${windowText(size)}`;
	const distance = handoffText(status, size, tokens);
	return `${paint.dim(`${ICON.context} ctx`)} ${paint.level(percent)(`${percent}%`)}${of}${distance}`;
};
