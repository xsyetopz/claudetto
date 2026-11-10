// `just validate`: the plugin's own validate over every change and main spec, with node:fs as `$.fs`.
import { openspec } from "../plugins/claudetto-openspec/hooks/openspec.ts";
import { nodeFs } from "./node-fs.ts";

const out = await openspec(
	{
		fs: nodeFs,
		run: () => Promise.reject(new Error("validate runs no process")),
		root: process.cwd(),
		date: "",
	},
	{ action: "validate" },
);
process.stdout.write(`${out}\n`);
if (/: INVALID\b/u.test(out)) {
	process.exitCode = 1;
}
