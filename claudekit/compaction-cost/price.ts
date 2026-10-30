// The published `claude-opus-5-5` price row, and the measured cost mix of a set of
// sessions. Prices come from `openspec/changes/claudetto-restart/references.md`,
// section "Official Prices", in dollars per million tokens.

import {
	type Request,
	requestsOf,
	type Session,
	sizeOf,
} from "./transcripts/transcripts.ts";

/** Dollars per million tokens, by billed line. */
interface Row {
	readonly fresh: number;
	readonly out: number;
	readonly write: number;
	readonly read: number;
}

/** `write` is the `1h` TTL, which this login sets. */
export const OPUS: Row = {
	fresh: 4,
	out: 20,
	write: 8,
	read: 0.2,
};

/** Dollars for `tokens` at a per-million rate. */
export const money = (tokens: number, rate: number): number =>
	(tokens * rate) / 1e6;

/** The measured cost of a set of sessions in dollars, split by billed line, with the request count. */
export interface Mix {
	readonly requests: number;
	readonly fresh: number;
	readonly read: number;
	readonly write: number;
	readonly out: number;
	readonly total: number;
	/** The cost of one assistant turn, which prices a turn of lost work. */
	readonly perTurn: number;
}

/** What these sessions cost, measured line by line, nothing modelled. */
export const mixOf = (sessions: readonly Session[]): Mix => {
	const requests = requestsOf(sessions);
	let fresh = 0;
	let read = 0;
	let write = 0;
	let out = 0;
	for (const request of requests) {
		fresh += money(request.fresh, OPUS.fresh);
		read += money(request.read, OPUS.read);
		write += money(request.write, OPUS.write);
		out += money(request.out, OPUS.out);
	}
	const total = fresh + read + write + out;
	return {
		requests: requests.length,
		fresh,
		read,
		write,
		out,
		total,
		perTurn: requests.length === 0 ? 0 : total / requests.length,
	};
};

/** The mean of `values`, or 0 for none. */
export const mean = (values: readonly number[]): number => {
	let sum = 0;
	for (const value of values) {
		sum += value;
	}
	return values.length === 0 ? 0 : sum / values.length;
};

/** The mean prompt that every request pays a cache read on. */
export const meanPrompt = (requests: readonly Request[]): number =>
	mean(requests.map(sizeOf));
