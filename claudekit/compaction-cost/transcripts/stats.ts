import { mean } from "../price.ts";
import {
	type Boundary,
	boundariesOf,
	type Request,
	type Session,
} from "./transcripts.ts";

export interface Gaps {
	readonly count: number;
	readonly median: number;
	readonly p90: number;
	readonly overHour: number;
	readonly over30m: number;
	readonly over5m: number;
}

export const gapsOf = (sessions: readonly Session[]): Gaps => {
	const gaps: number[] = [];
	for (const items of sessions) {
		const times = items
			.filter((item): item is Request => item.kind === "request")
			.map((item) => item.at)
			.filter((at) => at > 0);
		for (let index = 1; index < times.length; index += 1) {
			gaps.push(((times[index] ?? 0) - (times[index - 1] ?? 0)) / 1000);
		}
	}
	const sorted = [...gaps].sort((a, b) => a - b);
	const pick = (share: number): number =>
		sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * share))] ?? 0;
	return {
		count: gaps.length,
		median: pick(0.5),
		p90: pick(0.9),
		overHour: gaps.filter((gap) => gap > 3600).length,
		over30m: gaps.filter((gap) => gap > 1800).length,
		over5m: gaps.filter((gap) => gap > 300).length,
	};
};

export interface BoundaryStats {
	readonly count: number;
	readonly auto: number;
	readonly pre: number;
	readonly post: number;
	readonly keptShare: number;
	readonly keptLow: number;
	readonly keptHigh: number;
	readonly seconds: number;
}

export const boundaryStats = (sessions: readonly Session[]): BoundaryStats => {
	const all: Boundary[] = boundariesOf(sessions);
	const kept = all
		.filter((one) => one.pre > 0)
		.map((one) => (100 * one.post) / one.pre);
	return {
		count: all.length,
		auto: all.filter((one) => one.trigger === "auto").length,
		pre: mean(all.map((one) => one.pre)),
		post: mean(all.map((one) => one.post)),
		keptShare: mean(kept),
		keptLow: Math.min(...kept),
		keptHigh: Math.max(...kept),
		seconds: mean(all.map((one) => one.ms / 1000)),
	};
};
