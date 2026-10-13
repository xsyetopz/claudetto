// The gates of the change transitions in schema 2. Each gate is a pure function of the facts that its caller passes in.
// The `trace` facts come from the caller, because the trace check reads the diff, and a gate reads no file.
// Plain data and pure functions only.

import { type GateResult, PASS, refuse } from "./gates.ts";
import type { PackageState } from "./states.ts";

/** The facts of `specified`: the requirement headings with no valid ID, and the open markers. */
export interface SpecifiedFacts {
  readonly badIds: number;
  readonly openMarkers: number;
}

/** The gate of `specify` on a change that exists: each requirement has a valid ID, and no marker is open. */
export const gateSpecified = (facts: SpecifiedFacts): GateResult => {
  if (facts.badIds > 0)
    return refuse(
      `${facts.badIds} requirement heading(s) have no valid \`REQ-<n>\` ID.`,
    );
  if (facts.openMarkers > 0)
    return refuse(
      `${facts.openMarkers} \`[NEEDS CLARIFICATION]\` marker(s) are still open.`,
    );
  return PASS;
};

/** The facts of `plan`: the packages with a format error, the requirements that no package satisfies, and the `satisfies` IDs that no requirement has. */
export interface PlanFacts {
  readonly packageErrors: number;
  readonly uncovered: readonly string[];
  readonly unknown: readonly string[];
}

/** The gate of `plan`: each package passes its format check, each requirement is satisfied, and each `satisfies` ID exists. */
export const gatePlan = (facts: PlanFacts): GateResult => {
  if (facts.packageErrors > 0)
    return refuse(`${facts.packageErrors} package(s) fail the format check.`);
  if (facts.uncovered.length > 0)
    return refuse(`No package satisfies ${facts.uncovered.join(", ")}.`);
  if (facts.unknown.length > 0)
    return refuse(
      `\`satisfies\` names an unknown ID: ${facts.unknown.join(", ")}.`,
    );
  return PASS;
};

/** The facts of `accept`: the state of each package, and the counts of the trace check. */
export interface AcceptFacts {
  readonly packages: readonly PackageState[];
  readonly orphans: number;
  readonly uncited: number;
}

/** The gate of `accept`: each package is `done` or `canceled`, and the trace check finds no orphan and no uncited line. */
export const gateAccept = (facts: AcceptFacts): GateResult => {
  if (facts.packages.some((s) => s !== "done" && s !== "canceled"))
    return refuse("Each package must be `done` or `canceled`.");
  if (facts.orphans > 0)
    return refuse(`The trace check finds ${facts.orphans} orphan ID(s).`);
  if (facts.uncited > 0)
    return refuse(`The trace check finds ${facts.uncited} uncited line(s).`);
  return PASS;
};

/** The gate of `archive`: the change is `accepted`. */
export const gateArchive = (state: string): GateResult =>
  state === "accepted" ? PASS : refuse("The change must be `accepted`.");
