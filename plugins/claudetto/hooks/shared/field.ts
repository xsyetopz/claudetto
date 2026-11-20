import { isRecord } from "../settings/settings";

/** One field of a loosely typed payload, or undefined when the payload is no object. */
export const fieldOf = (value: unknown, key: string): unknown =>
	isRecord(value) ? value[key] : undefined;

/** The strings of an array value, or undefined when the value is no array. */
export const stringsOf = (value: unknown): string[] | undefined =>
	Array.isArray(value)
		? value.filter((item): item is string => typeof item === "string")
		: undefined;
