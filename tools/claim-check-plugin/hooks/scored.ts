// What a tuning scorer hands back. The engine loads this module, so it uses no Bun or node API.
import type { Findings } from "../../claim-check-report.ts";

/** The roads a scorer scored and the lines it adds to the summary. */
export type Scored = Pick<Findings, "title" | "roads" | "extra">;
