// The code lint (`bun run lint`): `biome ci` on the code folders, which fails on an error or a warning.
// Biome has no flag that fails on an info, so a second run reads the count of infos from the summary of the `json` reporter.
// That reporter is experimental in Biome, so a summary with no count of infos also fails.

import { $ } from "bun";
import { must, output, recipe } from "./recipes.ts";

const FOLDERS = ["plugins", "tests", "tools", "dev", "src"];

await recipe(async () => {
  await must($`bunx biome ci --error-on-warnings ${FOLDERS}`);
  const text = await output($`bunx biome ci --reporter=json ${FOLDERS}`);
  // Biome writes color codes around the JSON, also when the output is not a terminal.
  const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  const infos = JSON.parse(json)?.summary?.infos;
  if (infos === 0) return;
  console.error(
    typeof infos === "number"
      ? `Biome found ${infos} info diagnostics. Fix them, because an info fails the lint.`
      : "The Biome summary has no count of infos.",
  );
  process.exit(1);
});
