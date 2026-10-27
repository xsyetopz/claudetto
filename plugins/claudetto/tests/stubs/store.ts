// The stub of `$.store` for the lab tests: one map of keys to JSON values, so two sessions share it as they share the store file.

import type { On } from "claude-code";

/** Stubs `store.get` and `store.set` over `kv`. A value goes through JSON, as the store file keeps it. */
export const stubStore = (
	on: On,
	kv: Map<string, unknown> = new Map(),
): Map<string, unknown> => {
	on("store.get", (_$, e) => ({ value: kv.get(e.key) }));
	on("store.set", (_$, e) => {
		kv.set(e.key, structuredClone(e.value));
		return { value: undefined };
	});
	return kv;
};
