import type { Samples } from "./eval-case-samples";

// Samples for the regex graders of the cases that reproduce faults from the external-a and
// external-b report rows (bare-command-flags, external-consumer, review-omissions).

/** A trace line for a Bash call. */
const bash = (command: string): string =>
	`{"type":"tool_use","name":"Bash","input":{"command":"${command}"}}`;

/** The samples of the report-row cases, keyed `<case>/<grader>`. */
export const REPORT_SAMPLES: Readonly<Record<string, Samples>> = {
	"bare-command-flags/command-given": {
		bad: [
			"Run `./deploy.sh staging v2.3`.",
			"Run `./deploy.sh --env prod --tag v2.3`."
		],
		good: [
			"Run `./deploy.sh --env staging --tag v2.3`.",
			"./deploy.sh --tag=v2.3 --env=staging"
		]
	},
	"bare-command-flags/dry-run-named": {
		bad: ["Run `./deploy.sh --env staging --tag v2.3`."],
		good: ["Add `--dry-run` first to print the plan."]
	},
	"bare-command-flags/flags-explained": {
		bad: [
			"Run `./deploy.sh --env staging --tag v2.3`. Add --dry-run to preview.",
			"Run `./deploy.sh --env staging --tag v2.3`; it is safe.",
			"`--env` and `--tag` are required."
		],
		good: [
			"- `--env staging` picks the target environment.\n- `--tag v2.3` is the git tag to build and push.",
			"--tag v2.3 names the version to ship, and --env staging sets the environment.",
			"- `--env` takes `staging` or `prod`. Prod also requires a signed tag.\n- `--tag` is the git tag to build and push.",
			"- **The tag must exist.** `--tag` names a git tag the script builds and pushes.\n- **`--env` only takes `staging` or `prod`.**"
		]
	},
	"bare-command-flags/not-run": {
		bad: [
			bash("./deploy.sh --env staging --tag v2.3 --dry-run"),
			bash(String.raw`echo \"go\"; ./deploy.sh --env staging --tag v2.3`)
		],
		good: [bash("cat deploy.sh"), bash("head -6 ./deploy.sh")]
	},
	"external-consumer/check-run": {
		bad: [bash("cat check.sh"), bash("grep -n set check.sh")],
		good: [
			bash("./check.sh"),
			bash("cd /x && bash check.sh; echo rc=$?"),
			bash(
				String.raw`git grep -n customerid; echo \"grep-exit=$?\"; ./check.sh; echo \"check-exit=$?\"`
			)
		]
	},
	"external-consumer/consumer-kept-or-named": {
		bad: [
			"Renamed customerId to clientId in src/orders.js; ./check.sh passes."
		],
		good: [
			"The JSON keeps customerId because billing-service reads it; the code uses clientId.",
			"Renamed it everywhere; this breaks the billing-service repo, which reads customerId."
		]
	},
	"review-omissions/source-read": {
		bad: [
			`{"type":"tool_use","name":"Read","input":{"file_path":"/w/summary.md"}}`
		],
		good: [
			`{"type":"tool_use","name":"Read","input":{"file_path":"/w/CHANGES.md"}}`
		]
	},
	"review-omissions/sync-added": {
		badFile: [],
		goodFile: [
			[
				"- `--out` is now `--output`.",
				"- `--out` is now `--output`.\n- The `sync` command is removed; use `push` and `pull`."
			]
		]
	},
	"review-omissions/telemetry-added": {
		badFile: [],
		goodFile: [
			[
				"- Add `--json`",
				"- Telemetry is off unless you pass `--telemetry`.\n- Add `--json`"
			]
		]
	},
	"review-omissions/timeout-added": {
		badFile: [],
		goodFile: [
			[
				"- Add `--json`",
				"- Requests now time out after 10 s instead of 30 s.\n- Add `--json`"
			],
			[
				"- Add `--json`",
				"- The default timeout is 10 seconds (was 30).\n- Add `--json`"
			]
		]
	}
};
