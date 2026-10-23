// The mod handlers of the `prompt` slice:
// `prompt.context` adds the blocks `context_management` (the compaction state), `shell`, `plan` (the `plan` option), and `repo` (X5: branch, latest tag, open change, shell, `grep` engine).
// `tool.describe` gives each kept tool the shorter claudetto text, and defers the tools of `DEFERRED_TOOLS`.
// `prompt.attachment` turns the `off` attachments off, and gives the plan mode text a shorter text that names `claudetto:Scout`.
// `session.compact` adds the compaction line of the `built-in` path.
// `session.measure` keeps the band of each rate-limit window, and the next `classic.UserPromptSubmit` or `classic.PostToolBatch` adds the usage line once when a band changed.

import type { EngineInterface, PluginOptions } from "claude-code";
import { isBuiltInCompaction } from "../../../kernel/compaction.ts";
import type { Handler } from "../../../kernel/slice.ts";
import { sharesOf } from "../../../kernel/usage.ts";
import {
  CONTEXT_BLOCK,
  CONTEXT_TEXT,
  compactionState,
} from "../domain/compaction.ts";
import { SHELL_BLOCK, shellFacts } from "../domain/environment.ts";
import {
  PLAN_BLOCK,
  planLine,
  REPO_BLOCK,
  repoFacts,
  usesUgrep,
} from "../domain/facts.ts";
import { planModeText } from "../domain/plan-mode.ts";
import { DEFERRED_TOOLS, TOOL_TEXTS } from "../domain/tools.ts";
import { nextUsage } from "../domain/usage.ts";
import { FACT_CHANGES_MAX, FACT_RUN_TIMEOUT_MS } from "../limits.ts";
import { PRECOMPACT_LINE } from "../prompts.ts";

/** The `userConfig` values of the plugin, which the generated `register` gives to `keepOptions`. */
const kept: { options: PluginOptions } = { options: {} };

export const keepOptions = (options: PluginOptions): void => {
  kept.options = options;
};

/** The value of an env read, or `""` when it is unset or the read fails. */
const envValue = (read: Promise<string | undefined>): Promise<string> =>
  read.then(
    (value) => value ?? "",
    () => "",
  );

/** The output of a run, or `""` when it fails. */
const output = (
  run: Promise<{ exitCode: number; stdout: string }>,
): Promise<string> =>
  run.then(
    (r) => (r.exitCode === 0 ? r.stdout : ""),
    () => "",
  );

/** The shell facts of this process: `uname -s` runs one time, and a failed run gives no platform. */
let facts: Promise<string> | undefined;
const shellFactsOf = ($: EngineInterface): Promise<string> => {
  facts ??= Promise.all([
    output($.process.run(["uname", "-s"])),
    envValue($.env.get("SHELL")),
  ]).then(([platform, shell]) => shellFacts(platform, shell));
  return facts;
};

/** The repository facts of this process: the runs go one time, and a failed run gives an empty fact, because a throw here drops the `context_management` block too. */
let repo: Promise<string> | undefined;
const repoFactsOf = async ($: EngineInterface): Promise<string> => {
  repo ??= (async () => {
    const cwd = await $.session.cwd().catch(() => "");
    if (cwd === "") return "";
    const out = (argv: string[]) =>
      output($.process.run(argv, { cwd, timeoutMs: FACT_RUN_TIMEOUT_MS }));
    const dir = `${cwd}/openspec/changes`;
    const names = (await $.fs.list(dir).catch(() => []))
      .filter((f) => f.kind === "dir" && f.name !== "archive")
      .slice(0, FACT_CHANGES_MAX)
      .map((f) => f.name);
    const [branch, tag, shell, execPath, entrypoint, toolNames, changes] =
      await Promise.all([
        out(["git", "branch", "--show-current"]),
        out(["git", "describe", "--tags", "--abbrev=0"]),
        envValue($.env.get("SHELL")),
        envValue($.env.get("CLAUDE_CODE_EXECPATH")),
        envValue($.env.get("CLAUDE_CODE_ENTRYPOINT")),
        // A failed read counts as `Grep` on, so the block never claims `ugrep` from a guess.
        $.tool.list().then(
          (tools) => tools.map((t) => t.name),
          () => ["Grep"],
        ),
        Promise.all(
          names.map(async (name) => ({
            name,
            tasks: await $.fs.read(`${dir}/${name}/tasks.md`).catch(() => null),
          })),
        ),
      ]);
    const ugrep = usesUgrep({ execPath, toolNames, entrypoint });
    return repoFacts({ branch, tag, changes, shell, ugrep });
  })();
  return repo;
};

// A block of the same name from below is replaced, so each block is there one time.
export const onContext: Handler<"prompt.context"> = async ($, e, next) => {
  const { blocks, ...rest } = await next(e);
  const state = compactionState(
    kept.options,
    await $.env.get("DISABLE_COMPACT"),
  );
  const shell = await shellFactsOf($);
  const plan = planLine(kept.options["plan"]);
  const facts = await repoFactsOf($);
  const own = [
    { name: CONTEXT_BLOCK, text: CONTEXT_TEXT[state] },
    { name: PLAN_BLOCK, text: plan },
    { name: REPO_BLOCK, text: facts },
    { name: SHELL_BLOCK, text: shell },
  ];
  return {
    ...rest,
    blocks: [
      ...blocks.filter((b) => !own.some((o) => o.name === b.name)),
      ...own.filter((b) => b.text),
    ],
  };
};

// A tool text is ours when it is shorter than the engine text, so a shorter text of a new build stays.
// The `agents` slice and the `Agent(...)` deny rules of the settings drop the built-in agents.
export const onToolDescribe: Handler<"tool.describe"> = async (_$, e, next) => {
  const answer = await next(e);
  const text = TOOL_TEXTS[e.tool];
  const shorter =
    text !== undefined && text.length < answer.description.length
      ? { ...answer, description: text }
      : answer;
  return DEFERRED_TOOLS.includes(e.tool)
    ? { ...shorter, isDeferred: true }
    : shorter;
};

/** On the `built-in` compaction path, the summarizer gets `PRECOMPACT_LINE` after the text of `/compact`. */
export const onCompact: Handler<"session.compact"> = (_$, e, next) =>
  next(
    isBuiltInCompaction(kept.options)
      ? {
          ...e,
          instructions: [e.instructions, PRECOMPACT_LINE]
            .filter(Boolean)
            .join("\n\n"),
        }
      : e,
  );

/** The usage value of `$.state`: the last band of each window, the first share, and the line that waits for the next request. */
const usageRef = { plugin: "claudetto", key: "usage" } as const;

/** `session.measure`: keeps the bands, and holds one usage line when a band changed. It observes, so a fault changes nothing. */
export const onMeasure: Handler<"session.measure"> = async ($, e, next) => {
  const answer = await next(e);
  try {
    const { value } = await $.state.get(usageRef);
    const usage = nextUsage(value, sharesOf(e.rateLimits));
    if (usage !== null) await $.state.set(usageRef, usage);
  } catch {
    // A fault of the state leaves the line out.
  }
  return answer;
};

/** Adds the held usage line to `additionalContext` and clears it, so the line goes out once. */
const addLine = async <A extends { additionalContext?: string[] }>(
  $: EngineInterface,
  answer: A,
): Promise<A> => {
  try {
    const { value } = await $.state.get(usageRef);
    if (value?.line === undefined) return answer;
    const { line, ...rest } = value;
    await $.state.set(usageRef, rest);
    return {
      ...answer,
      additionalContext: [...(answer.additionalContext ?? []), line],
    };
  } catch {
    return answer;
  }
};

/** `classic.UserPromptSubmit`: adds the held usage line. */
export const onPrompt: Handler<"classic.UserPromptSubmit"> = async (
  $,
  e,
  next,
) => addLine($, await next(e));

/** `classic.PostToolBatch`: adds the held usage line before the next request of a turn. */
export const onBatch: Handler<"classic.PostToolBatch"> = async ($, e, next) =>
  addLine($, await next(e));

// The `off` verdicts of the attachments: the list is in `domain/off.ts`, and the filter in `hooks/register.ts` narrows the event to it and to `REWRITTEN_ATTACHMENTS`.

/** An attachment of an `off` kind is left out of the request, and the plan mode text is a shorter text that points a search over many files at `claudetto:Scout`. */
export const onAttachment = async <E extends { type: string; text: string }>(
  _$: unknown,
  e: E,
  next: (e: E) => Promise<{ text: string | null }>,
): Promise<{ text: string | null }> => {
  if (e.type !== "plan_mode") return { text: null };
  const answer = await next(e);
  return answer.text === null
    ? answer
    : { ...answer, text: planModeText(answer.text) };
};
