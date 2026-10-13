// The mod handlers of the `agents` slice: the `AGENTS` files of the start, the nested files on a read or a mention, and the `AGENTS` files of the added folders.
// Each `$` call is in this file, because `$` is not followed across an import.
// The handlers fail open: a failed read adds no file and never changes the result of the call.
// The loader of Claude Code follows the `@` imports, so `content` already holds them and this file does not resolve them.

import type { EngineInterface } from "claude-code";
import type { Handler } from "../../../../../kernel/slice.ts";
import {
  AGENTS_NAMES,
  dirOf,
  type Fields,
  type Found,
  freshFiles,
  isExcluded,
  type Kind,
  kindOf,
  type Loaded,
  nestedText,
  type Rules,
  readPaths,
  rulesOf,
} from "../domain/agents.ts";

/** The session values that `types/index.d.ts` declares: the files of the start, and the nested files that a call has loaded. */
const ROOT = { plugin: "dcc-plugin-agents-md", key: "root" } as const;
const NESTED = { plugin: "dcc-plugin-agents-md", key: "nested" } as const;

type Request = Parameters<EngineInterface["fs"]["ancestors"]>[0];
type Ancestor = Awaited<ReturnType<EngineInterface["fs"]["ancestors"]>>[number];

/** One loader entry as `Found`: the file, its tier, its text, and the files its imports brought. */
const toFound = (a: Ancestor, tier?: Kind): Found => {
  const [head, ...rest] = a.parts;
  return {
    path: head?.path ?? `${a.dir}/${a.name}`,
    kind: tier ?? kindOf(a.name),
    content: a.content,
    imported: rest.map((part) => part.path),
  };
};

/** The files the engine's loader finds for `request`. A failed read finds none. */
const walk = async (
  $: EngineInterface,
  request: Request,
  tier?: Kind,
): Promise<Found[]> => {
  try {
    const found = await $.fs.ancestors(request);
    return found.map((a) => toFound(a, tier));
  } catch {
    // A missing folder or a path outside the walk finds no file. The next call looks again.
    return [];
  }
};

/** The rules of `claudeMdExcludes` and `permissions.additionalDirectories`. A failed read gives none. */
const readRules = async ($: EngineInterface): Promise<Rules> => {
  try {
    return rulesOf(await $.settings.read());
  } catch {
    // Without the settings the plugin excludes nothing and adds no folder.
    return rulesOf({});
  }
};

/** The folder of the user settings: `CLAUDE_CONFIG_DIR`, or `.claude` in the home folder. */
const configDir = async ($: EngineInterface): Promise<string | undefined> => {
  const dir = await $.env.get("CLAUDE_CONFIG_DIR");
  if (dir) return dir;
  const home = await $.env.get("HOME");
  return home ? `${home}/.claude` : undefined;
};

/** The `AGENTS` files of the user folder, of each ancestor of the working directory, and of each added folder. */
const startFiles = async (
  $: EngineInterface,
  rules: Rules,
): Promise<Found[]> => {
  const found: Found[] = [];
  const dir = await configDir($);
  if (dir) {
    found.push(
      ...(await walk(
        $,
        { names: ["AGENTS.md"], of: `${dir}/AGENTS.md`, below: dirOf(dir) },
        "user",
      )),
    );
  }
  found.push(...(await walk($, { names: [...AGENTS_NAMES] })));
  if (
    (await $.env.get("CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD")) === "1"
  ) {
    for (const added of rules.dirs) {
      found.push(
        ...(await walk($, {
          names: [...AGENTS_NAMES],
          of: `${added}/.claude/AGENTS.md`,
          below: dirOf(added),
        })),
      );
    }
  }
  return found;
};

/** The `prompt.context` hook: adds the `AGENTS` files that the engine did not load, as its own `instructionFiles`. */
export const onContext: Handler<"prompt.context"> = async ($, e, next) => {
  const out = await next(e);
  // A hook above rewrote the `claudeMd` text, so the files behind it are unknown and this hook adds none.
  if (e.instructionFiles === undefined) return out;
  const rules = await readRules($);
  const found = (await startFiles($, rules)).filter(
    (file) => !isExcluded(file.path, rules.excludes),
  );
  const fresh = freshFiles(e.instructionFiles, found);
  const seen = [...e.instructionFiles, ...fresh].map((file) => ({
    path: file.path,
    content: file.content,
  }));
  await $.state.set(ROOT, seen);
  if (fresh.length === 0) return out;
  return {
    ...out,
    instructionFiles: [
      ...(out.instructionFiles ?? e.instructionFiles),
      ...fresh,
    ],
  };
};

/** The session root, which bounds the nested walk. A failed read gives none, so no nested file loads. */
const rootOf = async ($: EngineInterface): Promise<string | undefined> => {
  try {
    return await $.session.root();
  } catch {
    return undefined;
  }
};

/** The `AGENTS` files of the folders below the session root that hold `path`, with the files that they import. */
const nestedFiles = async (
  $: EngineInterface,
  path: string,
): Promise<Loaded[]> => {
  const below = await rootOf($);
  if (below === undefined) return [];
  const rules = await readRules($);
  const found = await walk($, { names: [...AGENTS_NAMES], of: path, below });
  const kept = found.filter((file) => !isExcluded(file.path, rules.excludes));
  const { value: root = [] } = await $.state.get(ROOT);
  const { value: nested = [] } = await $.state.get(NESTED);
  const fresh = freshFiles([...root, ...nested], kept);
  if (fresh.length > 0) await $.state.set(NESTED, [...nested, ...fresh]);
  return fresh;
};

/** The `context` entries of the nested files of the paths of a call. */
const contextFor = async (
  $: EngineInterface,
  paths: readonly string[],
): Promise<string[]> => {
  const texts: string[] = [];
  for (const path of paths) {
    for (const file of await nestedFiles($, path)) texts.push(nestedText(file));
  }
  return texts;
};

/** The paths of a `Read`, `Edit`, or `Write` call, or the file operands of a `Bash` read. */
const pathsOf = (
  e: { readonly tool: string } & Fields<"command" | "file_path">,
): string[] => {
  if (e.tool === "Bash")
    return typeof e.command === "string" ? readPaths(e.command) : [];
  return typeof e.file_path === "string" ? [e.file_path] : [];
};

/**
 * The `next` of a `tool.call` hook with a filter. A method signature makes its parameter bivariant, because the generated `register`
 * gives `next` the narrow type of the filter and does not narrow the handler type.
 */
type PassOn = {
  pass(
    e: Parameters<Parameters<Handler<"tool.call">>[2]>[0],
  ): ReturnType<Parameters<Handler<"tool.call">>[2]>;
}["pass"];

/** The `tool.call` hook: a call on a file in a nested folder adds the `AGENTS` files of that folder to the result. */
export const onToolCall = async (
  $: EngineInterface,
  e: Parameters<Handler<"tool.call">>[1],
  next: PassOn,
) => {
  const out = await next(e);
  if (out.deny !== undefined) return out;
  const texts = await contextFor($, pathsOf(e));
  if (texts.length === 0) return out;
  return { ...out, context: [...(out.context ?? []), ...texts] };
};

/** The `prompt.mention` hook: a mentioned file in a nested folder adds the `AGENTS` files of that folder. */
export const onMention: Handler<"prompt.mention"> = async ($, e, next) => {
  const out = await next(e);
  if (out.deny !== undefined) return out;
  const texts = await contextFor($, [e.path]);
  if (texts.length === 0) return out;
  return { ...out, context: [...(out.context ?? []), ...texts] };
};

/**
 * The `session.compact` hook: a compaction removes the nested texts from the transcript, so the dedupe of them ends.
 * A compaction that a hook skips keeps the transcript, so the dedupe stays.
 */
export const onCompact: Handler<"session.compact"> = async ($, e, next) => {
  const out = await next(e);
  if (out.skip === undefined) await $.state.set(NESTED, []);
  return out;
};
