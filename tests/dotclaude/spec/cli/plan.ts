// A fixture plan of a large change: `packages.md`, the briefs, and `events.jsonl`.

import { brief, eventsText, makeStore } from "./helpers.ts";

export const CHANGE = ".dotclaude/spec/changes/c1";

export interface PlanPackage {
  id: string;
  deps?: string[];
  owns?: string[];
  wave?: number;
  checked?: boolean;
  lane?: string;
  /** False writes the list entry but no brief. */
  brief?: boolean;
}

/** A store with the change `c1`: the packages in the order given. */
export const makePlan = (
  packages: PlanPackage[],
  extra: Record<string, string> = {},
): Promise<string> => {
  const waves = [...new Set(packages.map((p) => p.wave ?? 1))].sort();
  const list = waves
    .map((wave) => {
      const entries = packages
        .filter((p) => (p.wave ?? 1) === wave)
        .map(
          (p) =>
            `- [${(p.checked ?? p.lane === "done") ? "x" : " "}] ${p.id} Title of ${p.id}`,
        );
      return [`## Wave ${wave}`, "", ...entries].join("\n");
    })
    .join("\n\n");
  const files: Record<string, string> = {
    [`${CHANGE}/packages.md`]: `# Packages\n\n${list}\n`,
    [`${CHANGE}/events.jsonl`]: eventsText(
      Object.fromEntries(packages.map((p) => [p.id, p.lane ?? "planned"])),
    ),
  };
  for (const p of packages) {
    if (p.brief === false) continue;
    files[`${CHANGE}/packages/${p.id}.md`] = brief(
      p.id,
      p.deps ?? [],
      p.owns ?? [`src/${p.id}/`],
    );
  }
  return makeStore({ ...files, ...extra });
};
