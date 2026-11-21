import type { EngineInterface } from "claude-code";

/** What the fetch pipeline needs from a browser; tests stand in for it. */
export interface Chrome {
	/** The page's DOM after scripts ran, or undefined when the render failed. */
	render: (url: string) => Promise<string | undefined>;
	/**
	 * Opens a visible window on `url` for the person to solve a challenge, and
	 * resolves once they close it or the wait ends.
	 */
	solve: (url: string) => Promise<void>;
}

/** A current desktop Chrome string: sites serve the "HeadlessChrome" default a bot wall. */
export const USER_AGENT =
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

/** How long a person has to solve a challenge before the window is closed. */
export const SOLVE_TIMEOUT_MS = 180_000;

const MAC_APPS = [
	"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
	"/Applications/Chromium.app/Contents/MacOS/Chromium",
	"/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
	"/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"
];
const PATH_NAMES = [
	"google-chrome",
	"google-chrome-stable",
	"chromium",
	"chromium-browser",
	"chrome"
];

/** The path `which` prints for `name`, or null when it finds none or cannot run. */
async function which($: EngineInterface, name: string): Promise<string | null> {
	const found = await $.process.run(["which", name]).catch(() => null);
	const path = found?.stdout.trim() ?? "";
	return found?.exitCode === 0 && path !== "" ? path : null;
}

/**
 * Finds a Chrome or Chromium binary: `CHROME_PATH`, the macOS app bundles,
 * then each usual name on `PATH`.
 *
 * @param $ The plugin's engine interface.
 * @returns The binary's path, or undefined when the machine has none.
 */
export async function findChrome(
	$: EngineInterface
): Promise<string | undefined> {
	const given = await $.env.get("CHROME_PATH");
	if (given !== undefined && given !== "") {
		return given;
	}
	const present = await Promise.all(MAC_APPS.map((path) => $.fs.exists(path)));
	const app = MAC_APPS.find((_, i) => present[i] === true);
	if (app !== undefined) {
		return app;
	}
	const found = await Promise.all(PATH_NAMES.map((name) => which($, name)));
	return found.find((path) => path !== null) ?? undefined;
}

/** Flags that make a headless run print the page's DOM once its scripts settled. */
const HEADLESS = [
	"--headless=new",
	"--disable-gpu",
	"--hide-scrollbars",
	"--virtual-time-budget=8000",
	"--dump-dom"
];

/** A failed job leaves the queue open for the next one. */
const settle = (): void => {
	// The caller of the failed job sees its own outcome.
};

/**
 * Builds a Chrome driver over one dedicated profile folder. The profile is how
 * a solved challenge persists: Chrome keeps its cookies there, so every later
 * headless render of that site passes. Renders and solves share the profile, so
 * they run one at a time.
 *
 * @param $ The plugin's engine interface.
 * @param binary The Chrome binary.
 * @param profile The profile folder, under the plugin's data directory.
 */
export function makeChrome(
	$: EngineInterface,
	binary: string,
	profile: string
): Chrome {
	let queue: Promise<void> = Promise.resolve();
	const exclusive = <T>(job: () => Promise<T>): Promise<T> => {
		const run = queue.then(job, job);
		queue = run.then(settle, settle);
		return run;
	};
	const base = [
		binary,
		`--user-data-dir=${profile}`,
		"--no-first-run",
		"--no-default-browser-check",
		`--user-agent=${USER_AGENT}`
	];
	return {
		render: (url) =>
			exclusive(async () => {
				const out = await $.process
					.run([...base, ...HEADLESS, url], { timeoutMs: 60_000 })
					.catch(() => null);
				return out?.exitCode === 0 && out.stdout.trim() !== ""
					? out.stdout
					: undefined;
			}),
		solve: (url) =>
			exclusive(async () => {
				// The wait ending with the window open rejects: the run kills the window,
				// and the caller renders again to see whether the challenge passed.
				await $.process
					.run([...base, url], { timeoutMs: SOLVE_TIMEOUT_MS })
					.catch(settle);
			})
	};
}
