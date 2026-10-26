// The bounds of the module `jev`.
// `TRIES`, `BACKOFF_MS`, `ATTEMPT_TIMEOUT_MS`, `ERROR_BODY_MAX`, `MIN_CONFIDENCE`, and `YES_NO_UNSURE_BAND` are the bounds of each TypeSafe call, which `gate` and `session` share.
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

/** The number of tries of a TypeSafe call on a 429 or a 529 reply, the first one included. */
export const TRIES = 3;

/** The first wait before a retry of a TypeSafe call, in milliseconds. Each later wait doubles. */
export const BACKOFF_MS = 1_000;

/** The time of one try of a TypeSafe call, in milliseconds. `HttpInit` has no timeout, so the mod races the call with `$.clock`. */
export const ATTEMPT_TIMEOUT_MS = 12_000;

/** The most characters of a TypeSafe error body that an error keeps. */
export const ERROR_BODY_MAX = 200;

/** The confidence of a `choice` answer under which Jev is not sure: the floor of `confidence.md` ("The 0.5 confidence floor catches anything the model reports as genuinely uncertain"). */
export const MIN_CONFIDENCE = 0.5;

/** The distance from 0.5 under which a yes or no answer says that Jev is not sure: P(yes) from 0.7 is a yes and up to 0.3 is a no (`primitives-noul.md`). */
export const YES_NO_UNSURE_BAND = 0.2;
