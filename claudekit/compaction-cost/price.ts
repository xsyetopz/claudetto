import { money, priceOf } from "../price/cost.ts";
import {
	type Request,
	requestsOf,
	type Session,
	sizeOf,
} from "./transcripts/transcripts.ts";

interface Row {
	readonly fresh: number;
	readonly out: number;
	readonly write: number;
	readonly read: number;
}

const opus = priceOf("claude-opus-5-5").base;

/** The `claude-opus-5-5` row of the price table, with the `1h` write that this login sets. */
export const OPUS: Row = {
	fresh: opus.input,
	out: opus.output,
	write: opus.cacheWrite1h ?? Number.NaN,
	read: opus.cacheRead,
};

export interface Mix {
	readonly requests: number;
	readonly fresh: number;
	readonly read: number;
	readonly write: number;
	readonly out: number;
	readonly total: number;
	readonly perTurn: number;
}

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

export const mean = (values: readonly number[]): number => {
	let sum = 0;
	for (const value of values) {
		sum += value;
	}
	return values.length === 0 ? 0 : sum / values.length;
};

export const meanPrompt = (requests: readonly Request[]): number =>
	mean(requests.map(sizeOf));
