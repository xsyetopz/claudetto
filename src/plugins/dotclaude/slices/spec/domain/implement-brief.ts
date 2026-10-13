// The rules of the implement hook: which package an `implementer` prompt gives, and which `dotclaude-spec` call follows.
// This file is in the import graph of a hooks module, so it has no `node:` import and no `Bun`.

/** The front matter at the start of a brief, which the phase command gives to the `implementer` as its prompt. */
const FRONT_MATTER = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

/** The line `id: P33` in the front matter. */
const BRIEF_ID = /^id:[ \t]*(P\d+)[ \t]*$/m;

/** The id of the package that the prompt of a subagent names, or undefined when it is no brief. */
export const packageOf = (prompt: string): string | undefined =>
  BRIEF_ID.exec(FRONT_MATTER.exec(prompt)?.[1] ?? "")?.[1];

/** The arguments of `dotclaude-spec` that start the package `pkg`. */
export const implementArgs = (pkg: string): readonly string[] => [
  "implement",
  pkg,
];
