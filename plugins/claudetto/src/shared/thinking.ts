/**
 * For a model that cannot turn thinking off, `$.model.complete` sends `maxTokens` plus this room as `max_tokens`,
 * and the thinking has no budget of its own inside the sum. The result carries no `stop_reason`,
 * so `usage.output_tokens` at the sum is the only sign that the reply was cut.
 */
export const THINKING_ROOM = 2048;

export const capOf = (maxTokens: number): number => maxTokens + THINKING_ROOM;
