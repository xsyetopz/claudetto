import { fieldOf } from "../shared/field";

/** What a read returns in place of text the same loop already holds from the same call. */
export const UNCHANGED =
	"Unchanged since your last `read` of this range: that earlier result is current. If it is no longer in your context, call `read` again and the full text comes back.";

/**
 * The reads (TOOLS-033) each session's agent loops have seen, by the call's paths and range, so a repeat
 * whose text matches gets `UNCHANGED` once in place of the text. The next repeat
 * gets the text again, because a cleared or compacted earlier result is not
 * visible to a plugin; a compaction forgets every read.
 */
export class Repeats {
	private readonly seen = new Map<string, string>();

	/** The result to send: `UNCHANGED` for a matching repeat in `session`, else `result`. */
	answer(session: string, call: unknown, result: unknown): unknown {
		if (typeof result !== "string") {
			return result;
		}
		const key = JSON.stringify([
			session,
			fieldOf(call, "agentId") ?? "",
			fieldOf(call, "file_path"),
			fieldOf(call, "also") ?? [],
			fieldOf(call, "offset") ?? null,
			fieldOf(call, "limit") ?? null,
			fieldOf(call, "pages") ?? null
		]);
		if (this.seen.get(key) === result) {
			this.seen.delete(key);
			return UNCHANGED;
		}
		this.seen.set(key, result);
		return result;
	}

	/** Forgets every read, as a compaction drops the earlier results. */
	clear(): void {
		this.seen.clear();
	}
}
