import { baseName, stripWrappers } from "./wrappers.ts";

export const wordSet = (words: string) => new Set(words.split(" "));

export const RESERVED = wordSet(
	"{ } ! if then else elif fi while until do done",
);

const SHELLS = /^(?:ba|z|da|k)?sh$/;

const XARGS = wordSet("xargs parallel");

const FEEDS = new Set([...wordSet("done read mapfile readarray"), ...XARGS]);

const DATA = wordSet(
	"cat tee echo printf git gh grep egrep fgrep rg ag jq yq head tail wc sort uniq cut tr diff cmp base64 pbcopy less column ls mkdir cd export test [ true false :",
);

const SCRIPT_FLAG = /^-[A-Za-z]*c[A-Za-z]*$/;

export const nameOf = (argv: string[]): string =>
	baseName(stripWrappers(argv)[0] ?? "");

export const optionOf = (
	arg: string,
	valueOpts: ReadonlySet<string>,
): { flags: string[]; value?: string; next: boolean } => {
	if (!arg.startsWith("-")) {
		return { flags: [], next: false };
	}
	if (arg.startsWith("--")) {
		const name = arg.split("=", 1)[0] ?? arg;
		return valueOpts.has(name)
			? { flags: [name], value: name, next: name === arg }
			: { flags: [name], next: false };
	}
	const flags: string[] = [];
	for (let i = 1; i < arg.length; i++) {
		const opt = `-${arg[i]}`;
		flags.push(opt);
		if (valueOpts.has(opt)) {
			return { flags, value: opt, next: i === arg.length - 1 };
		}
	}
	return { flags, next: false };
};

export const operands = (
	args: string[],
	valueOpts: ReadonlySet<string> = new Set<string>(),
): string[] => {
	const out: string[] = [];
	for (let i = 0; i < args.length; i++) {
		const arg = args[i] ?? "";
		if (arg === "--") {
			return [...out, ...args.slice(i + 1)];
		}
		if (!arg.startsWith("-")) {
			out.push(arg);
		} else if (optionOf(arg, valueOpts).next) {
			i++;
		}
	}
	return out;
};

export const readsScript = (argv: string[]): boolean =>
	SHELLS.test(nameOf(argv)) &&
	!stripWrappers(argv)
		.slice(1)
		.some((a) => SCRIPT_FLAG.test(a));

export const scriptOf = (argv: string[]): string | undefined => {
	const name = nameOf(argv);
	const args = stripWrappers(argv).slice(1);
	if (name === "eval") {
		return args.join(" ");
	}
	const at = args.findIndex((a) => SCRIPT_FLAG.test(a));
	if (!SHELLS.test(name) || at < 0) {
		return undefined;
	}
	return args[args[at + 1] === "--" ? at + 2 : at + 1];
};

export const runsCode = (argv: string[]): boolean => {
	const name = nameOf(argv);
	return !(
		["", "eval", "source", "."].includes(name) ||
		name.startsWith("$") ||
		SHELLS.test(name) ||
		FEEDS.has(name) ||
		DATA.has(name) ||
		RESERVED.has(name)
	);
};

export const bodyKind = (
	head: string[],
): "script" | "feed" | "code" | "data" => {
	if (readsScript(head)) {
		return "script";
	}
	const name = nameOf(head);
	if (
		FEEDS.has(name) ||
		SHELLS.test(name) ||
		head.some((w) => FEEDS.has(baseName(w)))
	) {
		return "feed";
	}
	return runsCode(head) ? "code" : "data";
};

export const hiddenLevel = (
	argv: string[],
	script: string | undefined,
): number => {
	const first = stripWrappers(argv)[0];
	const name = nameOf(argv);
	if (readsScript(argv) || name === "source" || name === "." || script === "") {
		return 2;
	}
	// `xargs -I{} sh -c '{}'` puts each line of its input into the script.
	const fed = script !== undefined && argv.some((w) => XARGS.has(baseName(w)));
	return fed || script?.includes("$") || first === "" || name.startsWith("$")
		? 1
		: 0;
};
