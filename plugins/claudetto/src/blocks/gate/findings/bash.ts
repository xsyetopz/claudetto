import type { Facts } from "../gate.ts";
import { GIT_COMMON_COMMANDS } from "../limits.ts";
import { deleteTargets, lossKind, moveSources } from "../loss.ts";
import { codeSecret, pathOf } from "../paths.ts";
import * as T from "../prompts.ts";
import { parse } from "../shell/shell.ts";
import { nameOf, operands } from "../shell/shellkinds.ts";
import { baseName, stripWrappers } from "../shell/wrappers.ts";
import { deleteFindings, moveFindings } from "./delete.ts";
import { envAsk, fedFinding, PIPED, readsUnnamed } from "./fed.ts";
import {
	denySecret,
	type Finding,
	secretWord,
	systemWrite,
	verdict,
} from "./finding.ts";
import { gitFinding, sharedFinding } from "./git.ts";
import { holdsSecret, secretFinding } from "./secret.ts";
import { runsDownload, systemFinding } from "./system.ts";
import { uploadFinding } from "./upload.ts";

const LOSS = {
	db: verdict("ask", T.ASK_DB_LOSS),
	infra: verdict("ask", T.ASK_INFRA_LOSS),
};
const LITERAL_DOC =
	/\$\(\s*cat\s+<<-?\s*(['"])(\w+)\1[ \t]*\n(?:(?!\t*\2\n)[^\n]*\n)*\t*\2\n\s*\)/g;
const SUBSTITUTION_START = /\$\(|`/;
const DYNAMIC_CHAR = /[$`]/;
const INPUT_TARGET = /<\s*(['"]?)([^\s;&|<>'"]+)\1/g;

const nextDir = (
	rest: string[],
	dir: string | null,
	f: Facts,
): string | null | undefined => {
	const name = nameOf(rest);
	if (name !== "cd" && name !== "pushd") {
		return undefined;
	}
	const target = operands(rest.slice(1))[0];
	if (target === undefined) {
		return f.home;
	}
	return dir === null || target === "-" ? null : pathOf(dir, target, f);
};

const commandFindings = (
	argv: string[],
	rest: string[],
	dir: string | null,
	f: Facts,
	subagent: boolean,
	fed: { secret: boolean; subst: boolean; dynamic: boolean; opaque: boolean },
): Finding[] => {
	const targets = deleteTargets(rest);
	const kind = lossKind(rest);
	const piped =
		targets !== undefined && argv.some((w) => PIPED.has(baseName(w)));
	return [
		...[
			systemFinding(argv, rest, f, dir ?? f.cwd),
			secretFinding(argv, rest, f, dir),
			fedFinding(argv, rest, f, dir ?? f.cwd, fed),
			gitFinding(argv, f, dir),
			uploadFinding(rest, dir, f),
			subagent ? sharedFinding(argv, rest) : undefined,
			piped && targets.length === 0
				? verdict("ask", T.ASK_DELETE_PIPED)
				: undefined,
			kind && LOSS[kind],
		].filter((x) => x !== undefined),
		...(targets ? deleteFindings(targets, dir, f) : []),
		...moveFindings(moveSources(rest) ?? [], dir, f),
	];
};

export const parseWithGit = async (
	command: string,
	f: Facts,
): Promise<ReturnType<typeof parse>> => {
	const common = new Set(GIT_COMMON_COMMANDS);
	const first = parse(command, {
		aliases: new Map(),
		commands: common,
		builtins: common,
	});
	if (!first.unknownVerb) {
		return first;
	}
	const config = await f.gitConfig?.().catch(() => undefined);
	if (config === undefined) {
		return first;
	}
	return parse(command, {
		aliases: new Map(
			Object.entries(config.aliases).map(([k, v]) => [k.toLowerCase(), v]),
		),
		commands: new Set([...common, ...config.commands]),
		builtins: common,
	});
};

export const bashFindings = (
	command: string,
	f: Facts,
	subagent: boolean,
	parsed: ReturnType<typeof parse>,
): Finding[] => {
	if (parsed.truncated) {
		return [verdict("ask", T.ASK_TRUNCATED)];
	}
	const out: Finding[] = runsDownload(parsed.commands)
		? [verdict("ask", T.ASK_DOWNLOAD)]
		: [];
	if (parsed.unknown) {
		out.push(verdict("ask", T.ASK_UNKNOWN_PROGRAM));
	}
	if (parsed.gitProgram) {
		out.push(verdict("ask", T.ASK_GIT_PROGRAM));
	}
	const text = command.replace(LITERAL_DOC, "");
	const fed = {
		secret: holdsSecret(command, parsed.commands, f),
		subst: SUBSTITUTION_START.test(command),
		dynamic: DYNAMIC_CHAR.test(text),
	};
	if (readsUnnamed(text)) {
		out.push(fed.secret ? verdict("ask", T.ASK_SECRET_FED) : envAsk(f));
	}
	let dir: string | null = f.cwd;
	for (const argv of parsed.commands) {
		const rest = stripWrappers(argv);
		const moved = nextDir(rest, dir, f);
		if (moved !== undefined) {
			dir = moved;
		}
		out.push(
			...commandFindings(argv, rest, dir, f, subagent, {
				...fed,
				opaque: parsed.opaque.has(argv),
			}),
		);
	}
	for (const { target } of parsed.redirects) {
		const found = systemWrite(pathOf(dir ?? f.cwd, target, f));
		if (found) {
			out.push(found);
		}
	}
	const inputs = command.matchAll(INPUT_TARGET);
	const secret = [
		...[...inputs]
			.map((m) => m[2] ?? "")
			.filter((w) => [f.cwd, dir ?? f.cwd].some((d) => secretWord(d, w, f))),
		...parsed.code.map(codeSecret).filter((w) => w !== undefined),
	][0];
	return secret === undefined ? out : [...out, denySecret(secret)];
};
