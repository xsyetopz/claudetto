// The options of `claudetto-setup`: the parse of the arguments, and the settings that the off flags give.
import { parseArgs } from "node:util";
import type { Json } from "../domain/merge.ts";
import { t } from "../prompts.ts";

const NO_VALUES: string[] = [];
export const multi = {
	type: "string",
	multiple: true,
	default: NO_VALUES,
} as const;
export const flag = { type: "boolean", default: false } as const;

/** The options of the arguments, or the usage to print when they are wrong. */
export const parseOptions = (args: string[]) => {
	try {
		const { values } = parseArgs({
			args,
			options: {
				scope: { type: "string", default: "user" },
				mode: { type: "string", default: "merge" },
				keep: multi,
				"off-tool": multi,
				"off-skill": multi,
				"off-plugin": multi,
				"deny-mcp": multi,
				"exclude-md": multi,
				"claude-md-rule": multi,
				apply: flag,
				inventory: flag,
				"demo-alias": flag,
				"remove-openspec": flag,
				"claude-md": flag,
				"local-notes": flag,
			},
		});
		// The three write actions take `--apply` as their yes, so `--apply` clashes with the other actions only.
		const writes = [
			values["remove-openspec"],
			values["claude-md"],
			values["local-notes"],
		];
		const others = [values.inventory, values["demo-alias"]].filter(Boolean);
		const count = writes.filter(Boolean).length;
		const clash = count
			? count + others.length > 1
			: others.length + Number(values.apply) > 1;
		return clash || !["merge", "replace"].includes(values.mode)
			? { error: t("usage") }
			: values;
	} catch {
		return { error: t("usage") };
	}
};

export type Options = Exclude<
	ReturnType<typeof parseOptions>,
	{ error: string }
>;

/** The settings that turn off the names in `o`, with no key for an empty list. An off plugin or MCP server is for one project. */
export const offSettings = (o: Options): Json => {
	const each = (names: string[], value: unknown) =>
		Object.fromEntries(names.map((n) => [n, value]));
	const [tools, skills, plugins, servers] = [
		o["off-tool"],
		o["off-skill"],
		o["off-plugin"],
		o["deny-mcp"],
	];
	const keys: [string, string[], unknown][] = [
		["permissions", tools, { deny: tools }],
		["claudeMdExcludes", o["exclude-md"], o["exclude-md"]],
		["skillOverrides", skills, each(skills, "off")],
		["enabledPlugins", plugins, each(plugins, false)],
		[
			"deniedMcpServers",
			servers,
			servers.map((serverName) => ({ serverName })),
		],
	];
	return Object.fromEntries(
		keys
			.filter(([, names]) => names.length)
			.map(([key, , value]) => [key, value]),
	);
};
