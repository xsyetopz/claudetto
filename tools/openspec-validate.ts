// `just validate`: the plugin's own validate over every change and main spec, with node:fs as `$.fs`.
import { nodeFs } from "../plugins/claudetto-openspec/hooks/fixture-kit.ts";
import { openspec } from "../plugins/claudetto-openspec/hooks/openspec.ts";

const out = await openspec(
	{
		fs: nodeFs,
		run: () => Promise.reject(new Error("validate runs no process")),
		root: process.cwd(),
		date: "",
	},
	{ action: "validate" },
);
console.log(out);
if (/: INVALID\b/.test(out)) {
	process.exit(1);
}
