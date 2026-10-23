// The objects of `minispec show`, in the shape of `openspec show --json`.

import {
  type Block,
  type Delta,
  parseDelta,
  parseMain,
  requirementText,
  scenarioList,
} from "./markdown.ts";

const requirementOf = (b: Block, bare = false) => ({
  name: b.name,
  text: requirementText(b.raw),
  scenarios: bare ? [] : scenarioList(b.raw),
});

const deltasOf = (spec: string, d: Delta) => {
  const withReq = (operation: string, verb: string) => (b: Block) => {
    const requirement = requirementOf(b);
    return {
      spec,
      operation,
      description: `${verb} requirement: ${requirement.text}`,
      requirement,
      requirements: [requirement],
    };
  };
  return [
    ...d.added.map(withReq("ADDED", "Add")),
    ...d.modified.map(withReq("MODIFIED", "Modify")),
    ...d.removedBlocks.map(withReq("REMOVED", "Remove")),
    ...d.renamed.map((rename) => ({
      spec,
      operation: "RENAMED",
      description: `Rename requirement from "${rename.from}" to "${rename.to}"`,
      rename,
    })),
  ];
};

/** The `show --json` object of a change, from its delta specs (`id` is the folder under `specs/`). */
export const showChange = (
  name: string,
  specs: { id: string; text: string }[],
) => {
  const deltas = specs.flatMap(({ id, text }) =>
    deltasOf(id, parseDelta(text)),
  );
  return { id: name, title: name, deltaCount: deltas.length, deltas };
};

/** The `show --json` object of a main spec. `only` is the 1-based requirement of `-r`, and `bare` leaves out the scenarios. */
export const showSpec = (
  id: string,
  text: string,
  only?: number,
  bare = false,
) => {
  const all = parseMain(text).blocks.map((b) => requirementOf(b, bare));
  const requirements = only === undefined ? all : all.slice(only - 1, only);
  return {
    id,
    title: id,
    overview: parseDelta(text).purpose ?? "",
    requirementCount: requirements.length,
    requirements,
    metadata: { version: "1.0.0", format: "openspec" },
  };
};

/** The lines of `show --diff` for one delta spec against the blocks of its main spec. */
export const diffLines = (spec: string, d: Delta, main: Block[]) => {
  const block = (sign: string, b?: Block) =>
    (b?.raw.split("\n") ?? [""]).map((l) => `    ${sign}${l}`);
  const entry = (kind: string, b: Block, ...body: string[]) => [
    `  ${kind}: ${b.name}`,
    ...body,
    "",
  ];
  return [
    "",
    spec,
    "",
    ...d.added.flatMap((b) => entry("ADDED", b, ...block(" ", b))),
    ...d.removedBlocks.flatMap((b) => entry("REMOVED", b, ...block(" ", b))),
    ...d.renamed.map((r) => `  RENAMED: ${r.from} → ${r.to}`),
    ...d.modified.flatMap((b) =>
      entry(
        "MODIFIED",
        b,
        ...block(
          "-",
          main.find((m) => m.name === b.name),
        ),
        ...block("+", b),
      ),
    ),
  ];
};
