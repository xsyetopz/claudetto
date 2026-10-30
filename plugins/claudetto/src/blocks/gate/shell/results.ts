import type { Aliases } from "./git.ts";

export interface Queued {
	text: string;
	body: boolean;
	aliases?: Aliases | undefined;
	depth?: number;
	lone?: boolean;
}

const MULTI_COMMAND_CHAR = /[;&|()<>`$\\{}\r\n]/;
/** A redirect target that is a file descriptor number or `-`, so no file is recorded as written. */
export const FD_TARGET = /^(?:\d+|-)$/;
export const ENV_ASSIGNMENT = /^(\w+)=(.*)$/s;
export const CODE_ARG_CHAR = /[\s(){};]/;

export const oneCommand = (text: string): boolean =>
	!MULTI_COMMAND_CHAR.test(text);

export interface GitFacts {
	aliases: Aliases;
	commands: ReadonlySet<string>;
	builtins?: ReadonlySet<string>;
}

export const knownVerb = (
	git: GitFacts | undefined,
	lone: boolean,
	verb: string,
): boolean =>
	git === undefined ||
	(lone ? git.commands : (git.builtins ?? git.commands)).has(verb);

export type Held = Queued & { outs: string[] };

interface Redirect {
	op: string;
	target: string;
}

export interface ParseResult {
	commands: string[][];
	redirects: Redirect[];
	code: string[];
	background: string[][];
	opaque: Set<string[]>;
	truncated: boolean;
	unknown: boolean;
	unknownVerb: boolean;
	gitProgram: boolean;
}

export const readDataBodies = (data: Held[], programs: string[][]): string[] =>
	data
		.filter(({ outs }) =>
			outs.length > 0
				? outs.some((t) => programs.some((argv) => argv.includes(t)))
				: programs.length > 0,
		)
		.map(({ text }) => text);
