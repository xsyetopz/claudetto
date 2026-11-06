import { parseArgs } from "node:util";
import { checkHooks, engineTypes } from "./engine-types.ts";
import { isKind, KINDS, renderKind, variables } from "./template.ts";

export const TEMPLATE_HELP = `claudekit template <command> ...

Renders a plugin skeleton for one extension kind, a --settings file, or a probe (arms, cases, grader).

  list                                   the kinds
  vars KIND                              the variables KIND needs
  render KIND OUTDIR --var NAME=VALUE    write the files under OUTDIR; repeat --var for each variable.
                                         Fails, writing nothing, on an unset variable or an existing file.
  types                                  write the installed Claude Code's hook declarations to
                                         claudekit/types/claude-code.d.ts ($0, one claude -p against the fake)
  check DIR...                           type-check each plugin folder's hooks against those declarations

Kinds: ${KINDS.join(", ")}. A probe renders to OUTDIR/probes/NAME/probe.ts, so OUTDIR is the kit folder.
`;

export const templateCommand = async (argv: string[]): Promise<string> => {
	const { values, positionals } = parseArgs({
		args: argv,
		allowPositionals: true,
		options: { var: { type: "string", multiple: true, default: [] }, help: { type: "boolean", default: false } },
	});
	const [command, kind, outDir] = positionals;
	if (values.help || !command) {
		return TEMPLATE_HELP;
	}
	switch (command) {
		case "list":
			return KINDS.join("\n");
		case "vars":
			return (await variables(checkKind(kind))).join("\n");
		case "render": {
			if (outDir === undefined) {
				throw new Error("OUTDIR: missing; see claudekit template --help");
			}
			return (await renderKind(checkKind(kind), parseVars(values.var), outDir)).join("\n");
		}
		case "types": {
			const t = await engineTypes();
			return `${t.path}\t${t.version}\t${t.written ? "written" : "current"}`;
		}
		case "check": {
			const dirs = positionals.slice(1);
			if (dirs.length === 0) {
				throw new Error("DIR: missing; see claudekit template --help");
			}
			const result = await checkHooks(dirs, (await engineTypes()).path);
			if (!result.ok) {
				throw new Error(result.output.trimEnd());
			}
			return `hooks type-check in ${dirs.length} folders`;
		}
		default:
			throw new Error(`template command ${JSON.stringify(command)}: unknown; see claudekit template --help`);
	}
};

const checkKind = (kind: string | undefined) => {
	if (kind === undefined || !isKind(kind)) {
		throw new Error(`kind ${JSON.stringify(kind)}: unknown; kinds: ${KINDS.join(", ")}`);
	}
	return kind;
};

const parseVars = (pairs: string[]): Record<string, string> =>
	Object.fromEntries(
		pairs.map((p) => {
			const eq = p.indexOf("=");
			if (eq < 1) {
				throw new Error(`--var ${JSON.stringify(p)}: not NAME=VALUE`);
			}
			return [p.slice(0, eq), p.slice(eq + 1)];
		}),
	);
