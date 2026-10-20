// The bounds of the `decide` slice, in one place.
// Each attempt of the TypeSafe client has a timeout, and the whole run ends before `JEV_TIMEOUT_MS`.
// `ATTEMPT_TIMEOUT_MS * TRIES` plus the waits of `BACKOFF_MS` fit in `JEV_TIMEOUT_MS`, and a test pins that.

/** The most time that the hook waits for one run of the TypeSafe client, in milliseconds. */
export const JEV_TIMEOUT_MS = 45_000;

/** The number of tries of the TypeSafe client on a 429 or a 529 reply. */
export const TRIES = 3;

/** The first wait before a retry, in milliseconds. Each later wait doubles. */
export const BACKOFF_MS = 1_000;

/** The timeout of one try of the TypeSafe client, in milliseconds. */
export const ATTEMPT_TIMEOUT_MS = 12_000;

/** The most characters of an error body of the TypeSafe API that the client keeps. */
export const ERROR_BODY_MAX = 200;

/** The fewest options of a `pick` question. */
export const MIN_OPTIONS = 2;

/** The most options of a `pick` question. */
export const MAX_OPTIONS = 255;

/** The confidence under which a Jev answer says that Jev is not sure. */
export const MIN_CONFIDENCE = 0.5;

/**
 * The margin that a pick needs over chance, `1 / options`.
 * The confidence is the probability of the top option, so with 2 options it is never under 0.5.
 * A margin of 0.15 makes a 2-option pick need 0.65, which a guess near 0.5 or 0.6 does not reach.
 */
export const MIN_MARGIN = 0.15;

/** The distance from 0.5 under which a yes or no answer says that Jev is not sure. */
export const YES_NO_UNSURE_BAND = 0.2;

/**
 * The most P(yes) of the approval question under which Jev is sure that a question is not an approval.
 * An approval is money, a push, a release, a delete, or a step that cannot be undone, and only the user may approve it.
 * The bound is low, because a wrong "no" lets Jev approve for the user, and a wrong "yes" only shows a dialog.
 */
export const APPROVAL_MAX = 0.2;

/**
 * The most bytes of one `--image` file: 16 MiB, or 16,777,216 bytes.
 * The command checks the size of each file before it sends a request.
 * It does not add the sizes, so the API answers a request over 32 MiB with a `413`.
 */
export const IMAGE_BYTES_MAX = 16 * 1024 * 1024;

// The pixel bounds of one `--image`, from the TypeSafe docs and a live `400` ("Invalid image dimensions.").
// A 1554 x 2000 PNG got that `400`, and the same image at 1218 x 1568 got a `200`.
// The side bounds are inclusive, and so is the total: 1568 x 1568 is exactly `IMAGE_PIXELS_MAX`.
// A side of at least `IMAGE_SIDE_MIN` makes the total at least `IMAGE_PIXELS_MIN`, and a side of at most `IMAGE_SIDE_MAX` makes the total at most `IMAGE_PIXELS_MAX`.
// The total bounds are kept for the docs and for a test that pins them.

/** The fewest pixels of one side of an `--image`. */
export const IMAGE_SIDE_MIN = 280;

/** The most pixels of one side of an `--image`. */
export const IMAGE_SIDE_MAX = 1568;

/** The fewest pixels in total of an `--image`: 280 x 280. */
export const IMAGE_PIXELS_MIN = 78_400;

/** The most pixels in total of an `--image`: 1568 x 1568. */
export const IMAGE_PIXELS_MAX = 2_458_624;

/**
 * The most time that `sips` has to scale one `--image`, in milliseconds.
 * The scaling runs before the request, so `ATTEMPT_TIMEOUT_MS * TRIES`, the waits of `BACKOFF_MS`, and this time fit in `JEV_TIMEOUT_MS`, and a test pins that.
 * The images scale in parallel, so the time counts once.
 */
export const SCALE_TIMEOUT_MS = 5_000;
