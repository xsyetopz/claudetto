// A name is resolved by `git` from the config or read as a local path, so only an address can reach a new host.

import type { Facts, Verdict } from "../gate.ts";
import { pushTarget } from "../loss.ts";
import * as T from "../prompts.ts";
import type { GitCall } from "../shell/git.ts";
import { verdict } from "./finding.ts";

const URL_ADDRESS = /^[a-z][a-z0-9+.-]*:\/\//i;
const SCP_ADDRESS = /^[^/:\s]+:/;
const LOCAL_URL = /^file:\/\//i;

const isRemoteAddress = (target: string): boolean =>
	!LOCAL_URL.test(target) &&
	(URL_ADDRESS.test(target) || SCP_ADDRESS.test(target));

/** Only a person settles this ask, because the classifier is the one check left that judges the host. */
export const pushHostFinding = (
	call: GitCall,
	f: Facts,
	dir: string,
): (() => Promise<Verdict | undefined>) | undefined => {
	const target = pushTarget(call);
	if (target === undefined || !isRemoteAddress(target)) {
		return undefined;
	}
	return async () =>
		(await f.pushUrls?.(dir))?.includes(target)
			? undefined
			: verdict("ask", T.ASK_PUSH_HOST({ target }), { person: true });
};
