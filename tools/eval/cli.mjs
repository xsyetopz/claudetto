// `just eval`: runs the cases on both arms in containers and writes a report.
// The full suite costs money, so `just check` never runs it.
//
//   just eval [--cases a,b] [--runs N] [--limit USD] [--model M]
//             [--variant FILE] [--profile FILE] [--env FILE] [--out DIR]
//             [--claude-version X.Y.Z] [--dry-run] [--router]
//             [--no-delegation] [--no-stop-check] [--no-addons] [--gated ITEM,ITEM] [--suite NAME] [--concurrency N]
//             [--styles NAME,NAME]
// With `--styles`, the arms are `dotclaude`, `vanilla-concise`, and one arm for each `evals/styles/<NAME>.md`, and each arm gets its own report against `dotclaude` in `<out>/<arm>/`.
// With more than one gated item, the dotclaude arm runs one time, and each item gets its own report in `<out>/<item>/`.
// A suite is a folder of `evals/`: `router`, `delegation`, `code-graph`, `handoff`. No suite means the cases in `evals/` itself.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { loadCases } from "./cases.mjs";
import {
  dockerExec,
  dockerReachable,
  dockerRunner,
  imageTag,
  imageVersion,
} from "./container.mjs";
import { loadCredentials } from "./env.mjs";
import { searchRouter } from "./router.mjs";
import { writeRouterResult } from "./router-report.mjs";
import { allInvalid, runSuite, suiteReport } from "./suite.mjs";

const ROOT = path.join(import.meta.dirname, "../..");
/** The profile that setup writes, which the dotclaude arm loads unless `--profile` names another file (`eval-suite` spec). */
export const SETUP_PROFILE = path.join(
  ROOT,
  "plugins/dotclaude/features/setup/profile.json",
);

/** The settings profile of the dotclaude arm: the file of `--profile`, else the setup profile. */
export const loadProfile = (file) =>
  JSON.parse(fs.readFileSync(file ?? SETUP_PROFILE, "utf8"));

import { parseArgs } from "./args.mjs";

export { parseArgs };

function writeResult(out, { report, markdown, runs }) {
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(
    path.join(out, "report.json"),
    JSON.stringify(report, null, 2),
  );
  fs.writeFileSync(path.join(out, "report.md"), markdown);
  fs.writeFileSync(path.join(out, "runs.json"), JSON.stringify(runs, null, 2));
  console.log(markdown);
  console.log(`Wrote ${out}`);
}

export async function main(argv) {
  const o = parseArgs(argv);
  const suite = o.router ? "router" : (o.suite ?? "");
  const cases = loadCases(path.join(ROOT, "evals", suite), o.cases ?? null);
  const missing = (o.styles ?? []).filter(
    (n) => !fs.existsSync(path.join(ROOT, "evals", "styles", `${n}.md`)),
  );
  if (missing.length) {
    console.error(
      `No file \`evals/styles/<name>.md\` for: ${missing.map((n) => `\`${n}\``).join(", ")}.`,
    );
    return 1;
  }
  if (o.dryRun) {
    console.log(
      `${cases.length} cases, arms ${o.arms.join(" and ")}, ${o.runs} runs, limit ${o.limit} USD.`,
    );
    return 0;
  }
  const env = loadCredentials(o.env ?? path.join(ROOT, ".env"));
  if (!dockerReachable())
    throw new Error("Docker is not reachable. Start Docker or OrbStack.");
  const image = imageTag(
    o.claudeVersion,
    fs.readFileSync(path.join(ROOT, "tools/eval/container/Dockerfile"), "utf8"),
  );
  if (imageVersion(image) === null) {
    execFileSync(
      "docker",
      [
        "build",
        "--build-arg",
        `CLAUDE_VERSION=${o.claudeVersion}`,
        "-t",
        image,
        path.join(ROOT, "tools/eval/container"),
      ],
      { stdio: "inherit" },
    );
  }
  const profile = loadProfile(o.profile);
  const out =
    o.out ??
    path.join(
      ROOT,
      "evals/results",
      new Date().toISOString().replace(/[:.]/g, "-"),
    );
  const common = {
    // Each run keeps its files and events in `<out>/work/`.
    keepDir: out,
    runs: o.runs,
    limit: o.limit,
    concurrency: o.concurrency,
    // One budget for the whole call, so that the suites of the router search share the limit.
    budget: { spent: 0 },
    variantPath: o.variant,
    stylesDir: path.join(ROOT, "evals", "styles"),
    expectedVersion: o.claudeVersion,
    runner: dockerRunner({
      image,
      pluginsDir: ROOT,
      // The Jev add-on asks Jev only with its key, so the key goes in when `.env` has it.
      secrets: {
        CLAUDE_CODE_OAUTH_TOKEN: env.CLAUDE_CODE_OAUTH_TOKEN,
        ...(env.TYPESAFE_API_KEY && { TYPESAFE_API_KEY: env.TYPESAFE_API_KEY }),
      },
    }),
    exec: dockerExec(image),
  };
  if (o.router) {
    // The cases of a class are the cases with `taskClass` set to that class.
    // The effort goes to the run through the `effortLevel` settings key of the profile.
    // The run of 2026-10-08T23-27-40-285Z shows it for Haiku 5.5 and Sonnet 5.5: on each case, the output tokens rise from `low` to `xhigh`.
    // For Opus 5.5 it is inferred from the 2.1.295 bundle: a top-level `effortLevel` from `--settings` applies to each model.
    const ran = [];
    const run = async (taskClass, pair) => {
      const own = cases.filter((c) => c.def.taskClass === taskClass);
      if (own.length === 0) return [];
      const r = await runSuite(own, {
        ...common,
        arms: ["dotclaude"],
        model: pair.model,
        profile: { ...profile, effortLevel: pair.effort },
      });
      ran.push(...r.runs);
      return r.runs;
    };
    const results = await searchRouter(run);
    for (const r of results) console.log(r.message);
    writeRouterResult(out, results, {
      spent: common.budget.spent,
      limit: o.limit,
    });
    const bad = allInvalid(ran, ["dotclaude"]);
    if (bad) {
      console.error(bad);
      return 1;
    }
    if (common.budget.spent >= o.limit) {
      console.log(
        `The cost limit of ${o.limit} USD was reached, so the search is partial.`,
      );
      return 2;
    }
    return 0;
  }
  const result = await runSuite(cases, {
    ...common,
    arms: o.arms,
    model: o.model,
    profile,
  });
  if (o.arms.length > 2) {
    // One report for each gated or style arm against the shared `dotclaude` arm.
    const spent = result.report.meta.spent;
    for (const arm of o.arms.slice(1)) {
      const pair = ["dotclaude", arm];
      const runs = result.runs.filter((r) => pair.includes(r.arm));
      const opts = { limit: o.limit, model: o.model };
      const { report, markdown } = suiteReport(runs, pair, opts, {
        stopped: result.stopped,
        spent,
      });
      writeResult(path.join(out, arm.replace(/^gated-/, "")), {
        report,
        markdown,
        runs,
      });
    }
  } else writeResult(out, result);
  const bad = allInvalid(result.runs, o.arms);
  if (bad) {
    console.error(bad);
    return 1;
  }
  return result.stopped ? 2 : 0;
}

if (import.meta.main) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (e) => {
      console.error(e.message);
      process.exit(1);
    },
  );
}
