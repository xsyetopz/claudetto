// Declares the session-held values claudetto-spec keeps through `$.state`.
// The manifest's types contract must be self-contained, so the shape repeats
// `Baseline` from hooks/check/baseline.ts; `$.state.set` there type-checks against it.

declare module "claude-code" {
	interface PluginState {
		"claudetto-spec": {
			baseline: {
				specs: Record<string, string>;
				tests: Record<string, string | null>;
				known: string[];
			};
		};
	}
}
