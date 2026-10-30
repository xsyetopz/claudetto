export type Arm = "ref" | "alt";

export const ARMS: readonly Arm[] = ["ref", "alt"];

export interface Result {
	arm: Arm;
	size: number;
	run: number;
	cost: number;
	turns: number;
	compactions: number;
	peak: number;
	firstPre: number;
	firstPost: number;
	broken: number;
	untested: number;
	skipped: number;
	rereads: number;
	redone: number;
	next: number;
	firstWrite: number;
	shares: number[];
	invalid: string | null;
}

export type Measure = {
	[K in keyof Result]: Result[K] extends number ? K : never;
}[keyof Result];
