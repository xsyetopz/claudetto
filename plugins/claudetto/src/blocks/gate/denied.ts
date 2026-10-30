import type { HookFor } from "claude-code";
import {
	DENIAL_WRITE_TRIES_MAX,
	DENIALS_PER_CALL_MAX,
	type Denials,
	signature,
	withDenial,
} from "./denials.ts";

interface DenialIo {
	held: () => Promise<{ value: Denials | undefined; version: number }>;
	save: (denials: Denials, version: number) => Promise<boolean>;
}

const denialRef = { plugin: "claudetto", key: "denials" } as const;

const countDenial = async (
	io: DenialIo,
	key: string,
	reason: string,
	tries: number,
): Promise<number | undefined> => {
	if (tries <= 0) {
		return undefined;
	}
	const { value, version } = await io.held();
	const next = withDenial(value ?? {}, key, reason);
	return (await io.save(next, version))
		? next[key]?.count
		: countDenial(io, key, reason, tries - 1);
};

export const onDenied: HookFor<"classic.PermissionDenied"> = async (
	$,
	e,
	next,
) => {
	const answer = await next(e);
	try {
		const count = await countDenial(
			{
				held: () => $.state.get(denialRef),
				save: async (denials, version) =>
					(await $.state.set(denialRef, denials, { ifVersion: version })).isSet,
			},
			signature(e.tool_name, e.tool_input),
			e.reason,
			DENIAL_WRITE_TRIES_MAX,
		);
		return count !== undefined && count < DENIALS_PER_CALL_MAX
			? { ...answer, retry: true }
			: answer;
	} catch {
		return answer;
	}
};
