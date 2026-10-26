// The shared parts of the tests of `dev/sandbox/main.ts`, which run a fake `claude` first on `PATH`.
import path from "node:path";
import { REPO } from "../../support/repo.ts";

export const LAB = path.join(REPO, "dev/sandbox");
export const LOADED = "[DEBUG] Loaded inline plugin from path: demo";

// Writes `FAKE_LOG_TEXT` to the file after `--debug-file`, records its arguments in `FAKE_OUT`, and exits with `FAKE_EXIT`.
export const FAKE_CLAUDE = `(async () => {
const argv = process.argv.slice(2);
if (process.env.FAKE_OUT) await Bun.write(process.env.FAKE_OUT, JSON.stringify(argv));
if (process.env.FAKE_LOG_TEXT !== undefined)
  await Bun.write(argv[argv.indexOf("--debug-file") + 1], process.env.FAKE_LOG_TEXT);
process.exit(Number(process.env.FAKE_EXIT ?? 0));
})();
`;
