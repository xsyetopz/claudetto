export const BODY_NOT_JSON =
	"capture: a /v1/messages body is not JSON, so it is forwarded and not saved.";

export const OUT_MISSING = "capture: --out needs a folder, such as --out DIR.";

export const PORT_INVALID = (v: { port: string }): string =>
	`capture: --port needs a whole number from 1 to 65535, not "${v.port}".`;

export const UPSTREAM_INVALID = (v: { text: string }): string =>
	`The upstream ${v.text} is not a valid URL.`;

export const UPSTREAM_LOOP = (v: { text: string }): string =>
	`The upstream ${v.text} is the address of this proxy, so requests would loop. Pass --upstream URL, or unset ANTHROPIC_BASE_URL.`;

export const USAGE =
	"Usage: claudetto-capture [--port 8787] [--out DIR] [--upstream URL] [--no-count]";
