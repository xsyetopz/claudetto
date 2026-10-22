// The size bounds of MiniSpec, in one place.
// `tests/claudetto/spec/size.test.ts` fails when a file grows past a bound.
// Lower a bound with each cut, and raise it only for a behavior that `openspec/changes/0-3-0/design.md` (D10) names.

/** The most lines of the TypeScript of the `spec` slice (without this file) and of `bin/minispec`. */
export const CODE_LINES_MAX = 781;

/** The most bytes of the same files. */
export const CODE_BYTES_MAX = 27_441;

/** The most bytes of the files under `slices/spec/presets/`. */
export const PRESET_BYTES_MAX = 10_327;

/** The most bytes of the four `SKILL.md` files `propose`, `apply`, `verify`, and `archive`. */
export const SKILL_BYTES_MAX = 3_581;
