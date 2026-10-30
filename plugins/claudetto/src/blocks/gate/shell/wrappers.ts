const WORD = /(?:'[^']*'|"[^"]*"|\\.|[^\s'"\\])+/g;
const QUOTED_PART = /'([^']*)'|"([^"]*)"|\\(.)/g;
const LEADING_PATH = /^.*\//;
const SPLIT_STRING_OPT = /^--split-string(?:=|$)/;

export const words = (text: unknown): string[] =>
	[...String(text).matchAll(WORD)].map((m) =>
		m[0].replace(QUOTED_PART, (_, a, b, c) => a ?? b ?? c),
	);

/** Options that take a value per wrapper; `env -S` is left out because its value holds the command. */
const WRAPPERS: Record<string, string> = {
	sudo: "--user --group --host --prompt --chdir --role --type -u -g -h -p -C -D -R -T -U -r -t",
	env: "-u -C -P --unset --chdir",
	nice: "-n --adjustment",
	timeout: "-s -k --signal --kill-after",
	xargs:
		"-n -I -L -P -s -E -d -a --max-args --max-lines --max-procs --max-chars --delimiter --arg-file --eof",
	doas: "-u -C",
	ionice: "-c -n -p -P -u --class --classdata",
	chrt: "-T -P -D",
	stdbuf: "-i -o -e",
	exec: "-a",
	time: "-f -o",
	caffeinate: "-t -w",
	...Object.fromEntries(
		"setsid command builtin nohup noglob coproc".split(" ").map((w) => [w, ""]),
	),
};

const ASSIGNMENT = /^\w+=/;

export const baseName = (word: string): string =>
	word.replace(LEADING_PATH, "");

const readCluster = (
	env: boolean,
	opt: string,
	rest: string[],
	opts: string[],
): string | undefined => {
	for (let i = 1; i < opt.length; i++) {
		const split = env && opt[i] === "S";
		if (!split && !opts.includes(`-${opt[i]}`)) {
			continue;
		}
		const value = opt.slice(i + 1) || rest.shift();
		return split ? (value ?? "") : undefined;
	}
	return undefined;
};

const readOption = (
	head: string,
	opt: string,
	rest: string[],
	opts: string[],
): string | undefined => {
	if (head === "env" && SPLIT_STRING_OPT.test(opt)) {
		return opt.length > 14 ? opt.slice(15) : (rest.shift() ?? "");
	}
	if (opts.includes(opt)) {
		rest.shift();
	}
	if (opts.includes(opt) || opt.startsWith("--")) {
		return undefined;
	}
	return readCluster(head === "env", opt, rest, opts);
};

const dropOperands = (head: string, rest: string[]): void => {
	// `coproc NAME { git reset; }` names a group command.
	if (head === "coproc" && rest[1] === "{") {
		rest.shift();
	}
	if (head === "coproc" && rest[0] === "{") {
		rest.shift();
	}
	// `timeout` takes the duration, and `chrt` the priority, as its first plain word.
	if ((head === "timeout" || head === "chrt") && rest.length > 0) {
		rest.shift();
	}
	while (head === "env" && ASSIGNMENT.test(rest[0] ?? "")) {
		rest.shift();
	}
};

const dropWrapper = (head: string, spec: string, rest: string[]): void => {
	const opts = spec.split(" ");
	while ((rest[0] ?? "").startsWith("-")) {
		const split = readOption(head, rest.shift() ?? "", rest, opts);
		if (split !== undefined) {
			rest.unshift(...words(split));
		}
	}
	dropOperands(head, rest);
};

export const stripWrappers = (argv: string[]): string[] => {
	const rest = [...argv];
	while (rest.length > 0) {
		const first = rest[0] ?? "";
		const head = baseName(first);
		const spec = Object.hasOwn(WRAPPERS, head) ? WRAPPERS[head] : undefined;
		if (ASSIGNMENT.test(first)) {
			rest.shift();
		} else if (spec === undefined) {
			break;
		} else {
			rest.shift();
			dropWrapper(head, spec, rest);
		}
	}
	return rest;
};
