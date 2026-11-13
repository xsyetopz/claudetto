/// <reference types="bun" />
/** The instruction every compaction carries, so a correction, a refusal, or a consent survives the summary in the person's own words. */
export const PIN_COMPACT_KEEP =
	"Keep the person's corrections, refusals, and consents word for word.";

if (import.meta.main) {
	process.stdout.write(`${PIN_COMPACT_KEEP}\n`);
}
