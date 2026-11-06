#!/usr/bin/env bun
import { CAPTURE_HELP, captureCommand } from "../src/capture/command.ts";
import { type Command, COMMANDS as MODULE_COMMANDS } from "../src/cli/commands.ts";
import { FIXTURE_HELP, fixtureCommand } from "../src/fixture/command.ts";
import { TEMPLATE_HELP, templateCommand } from "../src/template/command.ts";

const COMMANDS: Record<string, Command> = {
	...MODULE_COMMANDS,
	capture: { help: CAPTURE_HELP, run: captureCommand },
	template: { help: TEMPLATE_HELP, run: templateCommand },
	fixture: { help: FIXTURE_HELP, run: fixtureCommand },
};

const HELP = `claudekit <module> <command> ...  (each module takes --help)

${Object.entries(COMMANDS)
	.map(([name, c]) => `${name}: ${c.help.split("\n")[0]}`)
	.join("\n")}
`;

const [module, ...rest] = Bun.argv.slice(2);
const command = module ? COMMANDS[module] : undefined;
if (!command) {
	console.log(HELP);
	process.exit(module && module !== "--help" ? 2 : 0);
}
if (rest.length === 0 || rest.includes("--help")) {
	console.log(command.help);
	process.exit(0);
}
try {
	console.log(await command.run(rest));
} catch (e) {
	console.error((e as Error).message);
	process.exit(1);
}
