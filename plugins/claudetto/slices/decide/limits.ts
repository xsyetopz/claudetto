// The bounds of the `decide` slice.
// The bounds that `guard` and `handoff` share (`TRIES`, `BACKOFF_MS`, `ATTEMPT_TIMEOUT_MS`, `ERROR_BODY_MAX`, `MIN_CONFIDENCE`, and `YES_NO_UNSURE_BAND`) are in `kernel/budget.ts`.
/** The fewest and the most options of a `pick` question. */
export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 255;
/** The most P(yes) of the approval question under which a question is no approval: a wrong "no" would let Jev approve for the user. */
export const APPROVAL_MAX = 0.2;
/** The most bytes of one `--image` file: 16 MiB. The API answers a request over 32 MiB with a `413`. */
export const IMAGE_BYTES_MAX = 16 * 1024 * 1024;
// The pixel bounds of one `--image` are inclusive, from the TypeSafe docs and a live `400`.
// A 1554 x 2000 PNG got that `400`, and the same image at 1218 x 1568 got a `200`.
export const IMAGE_SIDE_MIN = 280;
export const IMAGE_SIDE_MAX = 1568;
export const IMAGE_PIXELS_MIN = 78_400;
export const IMAGE_PIXELS_MAX = 2_458_624;
/** The most time that `sips` has to scale the images, in milliseconds. They scale in parallel. */
export const SCALE_TIMEOUT_MS = 5_000;
