import { isRecord } from "./record.ts";

export const blockText = (content: unknown): string =>
	typeof content === "string"
		? content
		: Array.isArray(content)
			? content.map((b) => (isRecord(b) && typeof b.text === "string" ? b.text : "")).join("\n")
			: "";
