// The answer of Jev to the offer of a handover (design D47).

import { pluginOptions } from "../../../../kernel/options.ts";
import {
	type JevClock,
	type JevHttp,
	noulOf,
	postJev,
} from "../../../jev/domain/jev.ts";
import { jevKey } from "../../../jev/domain/request.ts";
import { offerAnswer, offerBody } from "../cold.ts";
import { openChangeOf, type Port, rootOf } from "./project.ts";

/** The calls of the engine that `jevAnswer` uses. They take no `$`, so that `claude plugin validate` follows `$` in `mod.ts` alone. */
export interface JevCalls {
	key: () => Promise<string | undefined>;
	tokens: () => Promise<number>;
	http: JevHttp;
	clock: JevClock;
}

/** `Yes` or `No` when Jev is sure about the offer, else `undefined`. It needs the option `decide` as `jev` and a key: the option, else the exported key. A failed call is `undefined`. `lastTurnAt` is the time of the last request of the main thread. */
export const jevAnswer = async (
	calls: JevCalls,
	port: Port,
	now: number,
	lastTurnAt: number | null,
): Promise<"Yes" | "No" | undefined> => {
	const key = await jevKey(pluginOptions(), calls.key);
	if (!key) {
		return undefined;
	}
	const tokens = await calls.tokens();
	const { change, lines } = await openChangeOf(port, await rootOf(port));
	const task = lines.get(change?.next ?? "")?.line ?? "none";
	const idleMs = lastTurnAt === null ? null : now - lastTurnAt;
	const answers = await postJev(
		key,
		offerBody({ tokens, idleMs, task }),
		calls.http,
		calls.clock,
	).catch(() => undefined);
	return offerAnswer(noulOf(answers, "handover"));
};
