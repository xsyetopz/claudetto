// The assignments for `resolve.ts`: how the commands of a text set, add, and drop the values of its names.

import { fill, REFS, refName, unmask, type Vars, valuesOf } from "./fill.ts";
import { wordSet } from "./shellkinds.ts";
import { baseName } from "./wrappers.ts";

const ASSIGN = /^(\w+)(\+?)=(.*)$/s;
const ARRAY_OR_SUBSTITUTION = /^\(|`/;
const OPTION_FLAG = /^[-+]\w/;
const VALUE_CHANGING_FLAG = /^-\w*[ailuAn]/;
const REFERENCE_FLAG = /^-\w*n/;
const OPTION_PREFIX = /^[-+]/;
const WORD_NAME = /^\w+$/;
const READERS = wordSet("read mapfile readarray");
const LOOPS = wordSet("for select");
const DECLARERS = wordSet("export readonly declare typeset local");
const UNSETTERS = wordSet("unset");
/** The builtins whose bare name can make a local name, which has no value of the caller. */
const LOCALIZERS = wordSet("declare typeset local");

const setMany = (
	vars: Vars,
	name: string,
	values: (string | undefined)[],
	plain: boolean,
): void => {
	const held = vars.get(name) ?? {
		now: new Set(),
		later: new Set(),
		ever: new Set(),
	};
	for (const value of values) {
		held.ever.add(value);
	}
	if (plain) {
		held.now = new Set(values);
	} else {
		for (const value of values) {
			held.later.add(value);
		}
	}
	vars.set(name, held);
};

const set = (
	vars: Vars,
	name: string,
	value: string | undefined,
	plain: boolean,
): void => setMany(vars, name, [value], plain);

/** `unset` drops the plain value. `printf -v NAME` and `getopts OPTS NAME` write a value that the gate cannot read. */
const writeNames = (argv: string[], name: string, vars: Vars): void => {
	if (UNSETTERS.has(name)) {
		for (const w of argv.slice(1).filter((a) => !a.startsWith("-"))) {
			vars.set(w, {
				now: new Set(),
				later: vars.get(w)?.later ?? new Set(),
				ever: vars.get(w)?.ever ?? new Set(),
			});
		}
	}
	const written = name === "printf" ? argv[argv.indexOf("-v") + 1] : undefined;
	const opted = name === "getopts" ? argv[2] : undefined;
	for (const w of [written, opted]) {
		if (w !== undefined && w !== "") {
			set(vars, w, undefined, false);
		}
	}
};

/**
 * Records the assignments of `argv` in `vars`: `A=b`, `export A=b`, `readonly`, `declare`.
 * A value with a substitution, a name that `read` sets, and a loop variable have no known value.
 * `plain` is true for a command in the plain sequence of the text, which replaces the values of a name, and false for a command that may not run.
 */
export const assign = (argv: string[], vars: Vars, plain: boolean): void => {
	const name = baseName(argv[0] ?? "");
	if (READERS.has(name)) {
		for (const w of argv.slice(1)) {
			set(vars, w, undefined, plain);
		}
	}
	if (LOOPS.has(name) && argv[1] !== undefined) {
		set(vars, argv[1], undefined, false);
	}
	writeNames(argv, name, vars);
	if (DECLARERS.has(name)) {
		declare(argv, name, vars, plain);
		return;
	}
	const pairs = argv
		.filter((w) => !w.startsWith("-"))
		.map((w) => ASSIGN.exec(w));
	if (pairs.length === 0 || pairs.includes(null)) {
		return;
	}
	for (const m of pairs) {
		if (m) {
			put(vars, m, false, plain);
		}
	}
};

/** The values of the assignment text `value`: itself, or a copy of each combination of the values of its names. A plain `$` (`LIT`) is not a name, and the value has it back as `$`. */
const copies = (value: string, vars: Vars): (string | undefined)[] => {
	if (!value.includes("$")) {
		return [unmask(value)];
	}
	const { texts, unknown } = fill(value, vars, false);
	return unknown || texts.some((t) => t.includes("$"))
		? [undefined]
		: texts.map(unmask);
};

/** Sets the name of the match `m` of `ASSIGN`: `NAME+=x` adds a value that the gate cannot read, and so does a value with a substitution or an array. A value with `$NAME` takes each value of the name, and is unreadable when a name has no known value. */
const put = (
	vars: Vars,
	m: RegExpExecArray,
	opaque: boolean,
	plain: boolean,
): void => {
	const [, key = "", add = "", value = ""] = m;
	const unread = opaque || add === "+" || ARRAY_OR_SUBSTITUTION.test(value);
	const values = unread ? [undefined] : copies(value, vars);
	setMany(vars, key, values, plain && add === "");
};

/**
 * `export`, `readonly`, `declare`, `typeset`, and `local` words.
 * A flag that changes the value (`-i`, `-l`, `-u`, `-a`, `-A`, `-n`) makes it unreadable.
 * `-n` makes a name that points to another name, so both names are unreadable.
 * A bare name of `declare`, `typeset`, or `local` may be a new local name, so it is unreadable.
 */
const declare = (
	argv: string[],
	name: string,
	vars: Vars,
	plain: boolean,
): void => {
	const flags = argv.slice(1).filter((w) => OPTION_FLAG.test(w));
	const opaque = flags.some((w) => VALUE_CHANGING_FLAG.test(w));
	const refs = flags.some((w) => REFERENCE_FLAG.test(w));
	for (const w of argv.slice(1).filter((a) => !OPTION_PREFIX.test(a))) {
		const m = ASSIGN.exec(w);
		if (m) {
			put(vars, m, opaque, plain);
			if (refs) {
				set(vars, m[3] ?? "", undefined, false);
			}
		} else if (LOCALIZERS.has(name) && WORD_NAME.test(w)) {
			set(vars, w, undefined, false);
		}
	}
};

/** The names that `argv` reads, with the values that they have now, for `drifted`. */
export type Uses = Map<string, Set<string | undefined>>;

/** Notes the values of each name that the words of `argv` read, for a command that is not in the plain sequence. */
export const noteUses = (
	argv: string[],
	vars: Vars,
	uses: Uses,
	plain: boolean,
): void => {
	if (plain) {
		return;
	}
	for (const m of argv.join(" ").matchAll(REFS)) {
		const name = refName(m);
		const seen = uses.get(name) ?? new Set();
		for (const v of valuesOf(vars, name)) {
			seen.add(v);
		}
		uses.set(name, seen);
	}
};

/** Sets `unknown` of `result` when a name that a loop or a function read got a value later in the text, which the read did not see. */
export const markDrift = (
	uses: Uses,
	vars: Vars,
	result: { unknown: boolean },
): void => {
	const drifted = [...uses].some(([name, seen]) =>
		[...(vars.get(name)?.ever ?? [])].some((v) => !seen.has(v)),
	);
	if (drifted) {
		result.unknown = true;
	}
};
