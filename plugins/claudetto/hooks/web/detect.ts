/** Markers a bot-check page carries, whatever its length. */
const HARD_CHALLENGE =
	/cf-chl|challenge-platform|cf-turnstile|<title>\s*Just a moment|<title>\s*Attention Required|g-recaptcha|h-captcha|hcaptcha\.com|px-captcha|geo\.captcha-delivery|Checking your browser before/iu;

/** A loose mention that counts only on a page with almost no content of its own. */
const SOFT_CHALLENGE =
	/captcha|are you a (?:robot|human)|verify you are human/iu;

/** A page this short is a gate or an error, not an article. */
const SHORT = 1500;

/**
 * Whether `html` is a captcha or bot-check page rather than the content asked for.
 *
 * @param html The page source as served.
 * @param textLength Characters of readable content extracted from it: a long
 *   article that mentions "captcha" is content, a short page that does is a gate.
 */
export function isChallenge(html: string, textLength: number): boolean {
	return (
		HARD_CHALLENGE.test(html) ||
		(textLength < SHORT && SOFT_CHALLENGE.test(html))
	);
}

/** An empty client-rendered mount point such as `<div id="root"></div>`. */
const SHELL_MOUNT =
	/<div[^>]+id=["'](?:root|app|__next|__nuxt|svelte)["'][^>]*>\s*<\/div>|<noscript>[^<]*(?:enable javascript|requires javascript)/iu;

/** Smallest main content, in characters, that counts as a page. */
const MIN_CONTENT = 200;

/**
 * Whether the direct fetch got a page with no readable content, which a
 * headless render may fill in.
 *
 * @param html The page source as served.
 * @param textLength Characters of readable content extracted from it.
 */
export function needsRender(html: string, textLength: number): boolean {
	return (
		textLength < MIN_CONTENT &&
		(textLength === 0 || SHELL_MOUNT.test(html) || textLength < 80)
	);
}
