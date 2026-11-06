// The only models the kit prices and runs.
export const MODELS = {
	opus: "claude-opus-5-5",
	sonnet: "claude-sonnet-5-5",
	haiku: "claude-haiku-5-5",
} as const;

export type Model = (typeof MODELS)[keyof typeof MODELS];

// Paid runs use Haiku unless a case names another model.
export const DEFAULT_MODEL: Model = MODELS.haiku;
