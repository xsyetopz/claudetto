// Each `$.state` owner type and its contract type in `plugins/claudetto/types/index.d.ts` have the same shape, so `just typecheck` fails on drift (D5 of change `redesign-0-4-0`).

import type { PluginState, StateFamily } from "claude-code";
import type {
	Hashed,
	Watches,
} from "../../plugins/claudetto/modules/gate/state.ts";
import type {
	Calls,
	Told,
	Usage,
} from "../../plugins/claudetto/modules/session/state.ts";
import type {
	Known,
	Note,
	Notes,
	Saved,
} from "../../plugins/claudetto/modules/work/state.ts";

type Contract = PluginState["claudetto"];
/** The key tree of `T`, with no `readonly`, no `?`, and no `null`, because a mutual assignment does not see an optional field that one side lacks. */
type Keys<T> = T extends object
	? { -readonly [K in keyof T]-?: Keys<NonNullable<T[K]>> }
	: T;
type Identical<A, B> =
	(<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
		? true
		: false;
type Same<A, B> = [A] extends [B]
	? [B] extends [A]
		? Identical<Keys<A>, Keys<B>>
		: false
	: false;
type Holds<T extends true> = T;

export interface StateContract {
	told: Holds<Same<Contract["told"], Told>>;
	calls: Holds<Same<Contract["calls"], Calls>>;
	usage: Holds<Same<Contract["usage"], Usage>>;
	note: Holds<Same<Contract["note"], Note | null>>;
	notes: Holds<Same<Contract["notes"], Notes>>;
	bashKnown: Holds<Same<Contract["bashKnown"], StateFamily<Known | undefined>>>;
	bashSaved: Holds<Same<Contract["bashSaved"], StateFamily<Saved>>>;
	goalBlocks: Holds<Same<Contract["goalBlocks"], number>>;
	loopBlocks: Holds<Same<Contract["loopBlocks"], number>>;
	watches: Holds<Same<Contract["watches"], Watches>>;
	envHashes: Holds<Same<Contract["envHashes"], Hashed>>;
}
