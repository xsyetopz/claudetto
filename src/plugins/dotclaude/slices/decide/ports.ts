// The ports of the `decide` slice: the request that a decision takes, and the provider that answers it.
// This file has no runtime import, so the hooks module can load it.

/** One option of a `pick` question: its key, and a description with the facts for and against it. */
export interface Option {
  readonly key: string;
  readonly description?: string;
}

/** A question for a decision. Without `options`, the question is a yes or no question. */
export interface DecisionRequest {
  readonly question: string;
  readonly options?: readonly Option[];
  readonly state?: string;
}

/**
 * Why a decision has no answer.
 * `no-key`: the variable `TYPESAFE_API_KEY` is not set, so Jev is not tried.
 * `invalid-key`, `no-balance`, `usage`, and `failed`: the TypeSafe client failed with that cause.
 * `model-failed`: the fallback model gave no answer.
 */
export type Cause =
  | "no-key"
  | "invalid-key"
  | "no-balance"
  | "usage"
  | "failed"
  | "model-failed";

/** The result of one provider: the answer text, or the cause of no answer. */
export type Decision =
  | { readonly ok: true; readonly text: string }
  | { readonly ok: false; readonly cause: Cause };

/** A provider of decisions. Jev and the fallback model each implement it. */
export interface DecisionProvider {
  readonly name: "jev" | "fallback";
  readonly decide: (request: DecisionRequest) => Promise<Decision>;
}
