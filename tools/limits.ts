// The numbers of the repository gate, in one file so that a rule and its test read the same value.

/**
 * The least runs in one arm that a document may cite.
 * It is the citable floor that the paid probe printed before each round
 * (`docs/evidence/code-compaction-probe.md:363`).
 */
export const EVAL_MIN_RUNS_PER_ARM = 10;

/** The most lines a source file may hold. */
export const MAX_SOURCE_LINES = 300;

/** The most lines a test file may hold. */
export const MAX_TEST_LINES = 500;

/**
 * The Claude Code version the framework is built and tested against, which is the version
 * that wrote the vendored types under `plugins/claudetto/.claude-plugin/types/`.
 * `README.md` names it as the least supported version, and the `ci` workflow installs it.
 *
 * It is `2.1.314` and not `2.1.312` because `/claudetto:setup` rests on readings taken from the
 * `2.1.314` documentation of `clawdipedia`: that a `command.run` hook answering `{ text }` answers in
 * place of the command and that omitting `context` leaves the model nothing to read
 * (`extend/mod-api/events/command`), and that `$.fs.write` writes "to a file, creating it and its
 * directories as needed" (`extend/mod-api/calls/fs-store-state`). A `settings.read` hook was built
 * against the same pages and dropped on a measurement, so the floor rests on the command.
 */
export const MIN_CLAUDE_CODE_VERSION = "2.1.314";

/**
 * The default main-thread system body that `agents/main.md` replaces, in characters
 * (`system[2]`, `docs/prompt/overrides.md`). The agent file replaces this block rather than adding to
 * it, so a body larger than this number is a loss (`specs/prompt-footprint/spec.md`, "The Main Agent
 * File Is Smaller Than the Body It Replaces").
 *
 * The budget applies to the body after the frontmatter, because the frontmatter does not reach the
 * prompt: the body is 5,574 characters and `just capture --arm plugin --shipped` reads `system[2]` as
 * 5,572, against 5,818 for `--arm plain`.
 */
export const DEFAULT_MAIN_BODY_CHARS = 5627;
