// The mod handlers of the `handoff` slice: the handover (design D12, spec `handover`), a handoff file built in code, a `/clear`, and a resume prompt.
// The automatic compaction of Claude Code stays as the safety net. `classic.Stop` starts it at a quiet turn end, and `prompt.submit` offers it after a cold-cache pause.
// The steps run in a timer after the hook, because Claude Code refuses `$.command.run` and `$.prompt.submit` inside a hook that the turn waits on.
// Each path starts at the project root, because `$.fs` resolves a relative path against the folder of the shell (D23).

import type {
  EngineInterface,
  PluginOptions,
  SessionMessage,
} from "claude-code";
import { openChange } from "../../../kernel/change.ts";
import { passedChecks, taskLines } from "../../../kernel/checks.ts";
import { isBuiltInCompaction } from "../../../kernel/compaction.ts";
import { noulOf, postJev } from "../../../kernel/jev.ts";
import { CHANGES_DIR } from "../../../kernel/paths.ts";
import type { Handler } from "../../../kernel/slice.ts";
import { oneLine } from "../../../kernel/text.ts";
import { costReport, sharesOf } from "../../../kernel/usage.ts";
import { isCold, offerAnswer, offerBody } from "../cold.ts";
import { handoffPath, withChange } from "../compact.ts";
import {
  caseOf,
  groupOf,
  handoverText,
  modelOf,
  optionOf,
  pathOf,
  stepsOf,
} from "../handover.ts";
import type { Case, Path } from "../limits.ts";
import { CACHE_TTL_MS } from "../limits.ts";
import {
  COMPACT_KEEP,
  HANDOVER_HELD,
  HANDOVER_HELD_NOTICE,
  HANDOVER_NOTICE,
  HANDOVER_OFFER,
  HANDOVER_OFFER_RESUMED,
  HANDOVER_RESUME,
} from "../prompts.ts";

const kept: { options: PluginOptions } = { options: {} };

/** Keeps the `userConfig` values, which the generated `register` gives. */
export const keepOptions = (options: PluginOptions): void => {
  kept.options = options;
};

/** The time of the last request of the main thread, or `null` before the first turn of this process. */
let lastTurnAt: number | null = null;

/** Notes that the main thread, with no `agentId`, used the prompt cache just now (D47). */
const noteCache = async ($: EngineInterface, agentId: string | undefined) => {
  if (agentId === undefined)
    lastTurnAt = await $.clock.now().catch(() => lastTurnAt);
};

/** On a resume or a fork, takes the last answer of the transcript as the last request, so a short pause gets no offer. */
export const onResume: Handler<"classic.SessionStart"> = async ($, e, next) => {
  const seconds = e.seconds_since_last_response;
  if (seconds !== undefined)
    lastTurnAt = await $.clock.now().then(
      (now) => now - seconds * 1000,
      () => lastTurnAt,
    );
  return next(e);
};

export const onTurnComplete: Handler<"turn.complete"> = async ($, e, next) => {
  await noteCache($, e.agentId);
  return next(e);
};

/** The model of the first step after the resume of a handover, or `null` for the session model. */
let coldModel: string | null = null;

/** `turn.step`: notes each request of the main thread, and names the model of the table on the first step after a handover. */
export const onTurnStep: Handler<"turn.step"> = async function* ($, e, next) {
  await noteCache($, e.agentId);
  if (e.agentId !== undefined || coldModel === null) return yield* next(e);
  const model = coldModel;
  coldModel = null;
  return yield* next({ ...e, model });
};

/** The project root with a final `/`, or `""` with no root (D23). */
const rootOf = async ($: EngineInterface): Promise<string> => {
  const root =
    (await $.env.get("CLAUDE_PROJECT_DIR").catch(() => undefined)) ||
    (await $.session.root().catch(() => ""));
  return root === "" ? "" : `${root.replace(/\/+$/, "")}/`;
};

/** The open change among the folders of `openspec/changes/` (not `archive`), with the task lines of its `tasks.md`. */
const openChangeOf = async ($: EngineInterface, root: string) => {
  const entries = await $.fs.list(`${root}${CHANGES_DIR}`).catch(() => []);
  const changes = await Promise.all(
    entries
      .filter((e) => e.kind === "dir" && e.name !== "archive")
      .map(async ({ name }) => ({
        name,
        tasks: await $.fs
          .read(`${root}${CHANGES_DIR}/${name}/tasks.md`)
          .then((t) => (typeof t === "string" ? t : null))
          .catch(() => null),
      })),
  );
  const change = openChange(changes);
  const tasks = changes.find((c) => c.name === change?.name)?.tasks ?? "";
  return { change, lines: taskLines(tasks) };
};

/** The size in bytes of the file after the write of `text` to `path`, or `0` when the write fails. */
const writtenSize = ($: EngineInterface, path: string, text: string) =>
  $.fs
    .write(path, text)
    .then(() => $.fs.stat(path))
    .then(
      (stat) => stat.size,
      () => 0,
    );

/** The task group of the next open task of the open change, or `null` with no open change. */
const groupNow = async ($: EngineInterface): Promise<string | null> => {
  const { change } = await openChangeOf($, await rootOf($));
  return groupOf(change?.next ?? null);
};

/** True when an agent of the session runs, or a background task is in flight. */
const isBusy = async ($: EngineInterface, tasks: readonly unknown[] = []) =>
  tasks.length > 0 ||
  (await $.agent.list().catch(() => [])).some(
    (agent) => agent.status === "running" || agent.status === "pending",
  );

/** The task group at the last quiet turn end, or `null` before the first one. */
let lastGroup: string | null = null;

/** True while a path runs, so a second trigger cannot start a second path. */
let isRunning = false;

/** The usage value that `prompt` keeps from `session.measure`, which holds the first share of each window. */
const usageRef = { plugin: "claudetto", key: "usage" } as const;

/** The cost report of the session: the cost, and the change of each share since the first reading. A fault gives `none`. */
const reportOf = async ($: EngineInterface): Promise<string> => {
  try {
    const [usage, { value }] = await Promise.all([
      $.session.usage(),
      $.state.get(usageRef),
    ]);
    return costReport(
      usage.cost?.usd,
      sharesOf(usage.rateLimits),
      value?.start ?? {},
    );
  } catch {
    return "none";
  }
};

/** Writes the handoff text to `.claudetto/handoffs/`, or gives `null` when the file is empty or missing. */
const handoverOf = async (
  $: EngineInterface,
  messages: readonly SessionMessage[],
) => {
  const root = await rootOf($);
  const { change, lines } = await openChangeOf($, root);
  const text = withChange(
    `${handoverText(messages, await reportOf($), change && (lines.get(change.next)?.line ?? null))}\n`,
    change,
    passedChecks(messages),
    lines,
  );
  return { root, text };
};

/** Queues the steps after the hook, each after the one before ends. A failed step ends the run. */
const queue = (
  $: EngineInterface,
  steps: readonly (() => Promise<unknown>)[],
): void => {
  isRunning = true;
  $.clock.after(0, async () => {
    try {
      for (const step of steps) await step();
    } catch {
      // A refused command leaves the session as it is.
    } finally {
      isRunning = false;
    }
  });
};

/** Starts `path` with the `held` prompt after it. A file that is missing or empty stops the path. True when it started. */
const begin = async (
  $: EngineInterface,
  path: Path,
  held: string | null,
  model: string | null,
): Promise<boolean> => {
  const messages = await $.session.messages();
  if (!Array.isArray(messages) || isRunning) return false;
  const steps = stepsOf(path, held !== null);
  const { root, text } = await handoverOf($, messages);
  const file = handoffPath(new Date());
  if (steps.includes("write")) {
    if ((await writtenSize($, `${root}${file}`, text)) === 0) return false;
    $.ui.log(oneLine(HANDOVER_NOTICE({ file })));
  }
  const resume = [
    HANDOVER_RESUME({ path: file }),
    "",
    text,
    ...(held === null ? [] : ["", HANDOVER_HELD({ prompt: held })]),
  ].join("\n");
  const actions = {
    clear: () => $.command.run({ command: "clear" }),
    compact: () =>
      $.command.run({ command: "compact", args: COMPACT_KEEP({ text }) }),
    resume: () => {
      coldModel = model;
      return $.prompt.submit({ text: resume });
    },
    held: () =>
      $.prompt.submit({ text: HANDOVER_HELD({ prompt: held ?? "" }) }),
  };
  queue(
    $,
    steps
      .filter((step) => step !== "write")
      .map((step) => actions[step as keyof typeof actions]),
  );
  return true;
};

/** `Yes` or `No` when Jev is sure about the offer, else `undefined`. It needs the option `decide` as `jev` and a key: the option, else the exported key. A failed call is `undefined`. */
const jevAnswer = async (
  $: EngineInterface,
  now: number,
): Promise<"Yes" | "No" | undefined> => {
  const option = kept.options["TYPESAFE_API_KEY"];
  const key =
    kept.options["decide"] === "jev"
      ? (typeof option === "string" && option) ||
        (await $.env.get("TYPESAFE_API_KEY"))
      : undefined;
  if (!key) return undefined;
  const tokens = (await $.session.usage()).context.tokens ?? 0;
  const { change, lines } = await openChangeOf($, await rootOf($));
  const task = lines.get(change?.next ?? "")?.line ?? "none";
  const idleMs = lastTurnAt === null ? null : now - lastTurnAt;
  const answers = await postJev(
    key,
    offerBody({ tokens, idleMs, task }),
    { fetch: (address, request) => $.http.fetch(address, request) },
    { sleep: (delay, stop) => $.clock.sleep(delay, stop) },
  ).catch(() => undefined);
  return offerAnswer(noulOf(answers, "handover"));
};

/** Starts the path that the option and the table choose for `kind`. */
const startCase = async (
  $: EngineInterface,
  kind: Case,
  tokens: number,
  held: string | null,
): Promise<boolean> => {
  const path = pathOf(kind, tokens, optionOf(kept.options));
  return path === null ? false : begin($, path, held, modelOf(kind, tokens));
};

/** `classic.Stop`: at a quiet turn end, starts a handover for the triggers 1 and 3 of D12. The stop goes on as it is. */
export const onStop: Handler<"classic.Stop"> = async ($, e, next) => {
  const result = await next(e);
  if (isBuiltInCompaction(kept.options) || isRunning) return result;
  if (await isBusy($, e.background_tasks)) return result;
  const [usage, now, group] = await Promise.all([
    $.session.usage(),
    $.clock.now(),
    groupNow($),
  ]);
  const kind = caseOf({
    tokens: usage.context.tokens ?? 0,
    startedAt: usage.startedAt,
    now,
    group,
    before: lastGroup,
  });
  lastGroup = group;
  if (kind !== null) await startCase($, kind, usage.context.tokens ?? 0, null);
  return result;
};

/** `prompt.submit`: offers the handover after a pause over the cache TTL. With a Jev key, Jev answers when it is sure, and the dialog shows when it is not. On the yes, the prompt is held and runs after the resume. */
export const onPrompt: Handler<"prompt.submit"> = async ($, e, next) => {
  if (
    isBuiltInCompaction(kept.options) ||
    isRunning ||
    e.origin.kind !== "composer" ||
    e.command !== undefined ||
    e.isMeta ||
    e.turnId !== undefined
  )
    return next(e);
  const now = await $.clock.now();
  if (!isCold(now, lastTurnAt) || (await $.session.turns()) === 0)
    return next(e);
  if (await isBusy($)) return next(e);
  const answer =
    (await jevAnswer($, now)) ??
    (await $.ui
      .ask(
        lastTurnAt === null
          ? HANDOVER_OFFER_RESUMED
          : HANDOVER_OFFER({ minutes: String(CACHE_TTL_MS / 60_000) }),
        ["Yes", "No"],
      )
      .catch(() => "No"));
  if (answer !== "Yes") return next(e);
  const tokens = (await $.session.usage()).context.tokens ?? 0;
  const isStarted = await startCase($, "idle", tokens, e.text);
  return isStarted ? { drop: HANDOVER_HELD_NOTICE } : next(e);
};
