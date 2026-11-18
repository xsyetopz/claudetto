import type { On } from "claude-code";
import { resetRenewal } from "./renewal";
import { isOff, PENDING, writeHandover } from "./writer";

const BLOCK = "claudetto:handover";

/**
 * Writes a handover before a person's `/clear` and sends it once, as a
 * context block of the first request after the clear. The pending text sits
 * in `$.store` because a reload drops module state between the two (RT-026).
 */
export function registerClear(on: On): void {
	on("command.run", async ($, e, next) => {
		if (e.command !== "clear" || e.origin.kind === "plugin" || (await isOff($))) return next(e);
		const { text } = await writeHandover($);
		await $.store.set(PENDING, text);
		return next(e);
	});
	on("session.end", async (_$, e, next) => {
		if (e.reason === "clear") resetRenewal();
		return next(e);
	});
	on("prompt.context", async ($, e, next) => {
		const result = await next(e);
		const text = await $.store.get(PENDING);
		if (typeof text !== "string" || text === "") return result;
		await $.store.delete(PENDING);
		return { ...result, blocks: [...result.blocks.filter((b) => b.name !== BLOCK), { name: BLOCK, text }] };
	});
}
