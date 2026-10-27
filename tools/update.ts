// Refreshes the claudetto marketplace, then updates each plugin of `plugins/` that the user installed (`just update`).

import path from "node:path";
import { eachInOrder } from "./ordered.ts";
import { must, pluginDirs, recipe } from "./recipes.ts";
import { $claude } from "./telemetry.ts";

await recipe(async () => {
	await must($claude()`claude plugin marketplace update claudetto`);
	await eachInOrder(await pluginDirs(), async (dir) => {
		await must(
			$claude()`claude plugin update ${`${path.basename(dir)}@claudetto`}`,
		);
	});
});
