// The hook lab (`just lab`): `claude plugin test` on each plugin that has a `tests/` folder.
// The first plugin that fails stops the run with its exit code.

import { eachInOrder } from "./ordered.ts";
import { must, pluginDirsWith, recipe } from "./recipes.ts";
import { $claude } from "./telemetry.ts";

await recipe(async () => {
	await eachInOrder(await pluginDirsWith("tests"), async (dir) => {
		await must($claude()`claude plugin test ${dir}`);
	});
});
