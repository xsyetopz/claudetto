// The `low` rows of the table `Vn` of Claude Code `2.1.312`, module `chunk-45pm9m17.js`, from
// offset 50,774, in the program's order, which the redaction pass keeps.
//
// A `low` row reads a shape rather than a vendor prefix: an assignment, a URL's user info, a web
// token. The program runs these before the `high` ones, because a masked head leaves a tail that
// three of them then clean up. Each backslash is doubled, as `parts.ts` explains.

import {
	ASSIGN,
	AUTH_SCHEME,
	CLOUD_ASSIGN,
	type Entry,
	ESCAPED_ASSIGN,
	ESCAPED_QUOTE,
	JWT,
	MASK_TAIL,
	TICK,
} from "../parts.ts";

/** The shape-based rows of the program's table, in its order; the redaction pass runs them before the `high` rows. */
export const LOW_ENTRIES: readonly Entry[] = [
	{
		id: "url-userinfo",
		source: `:\\/\\/((["'])[^/@\\s]*\\2(?=@)|(?:[^/@\\s"'|,;&${TICK}]+(?=@))|[^/@\\s"'|,;&${TICK}]*["'|,;&${TICK}][^/@\\s]*@)@?`,
		confidence: "low",
	},
	{
		id: "gcp-service-account",
		source: "\\b([a-z0-9-]{1,64}@[a-z0-9-]+\\.iam\\.gserviceaccount\\.com)\\b",
		flags: "i",
		confidence: "low",
	},
	{
		id: "loose-anthropic-key",
		source: "\\b(sk-ant-?[\\w-]{10,})",
		confidence: "low",
	},
	{
		id: "http-auth-scheme",
		source: `\\b${AUTH_SCHEME}([A-Za-z0-9+/=._~-]{20,})`,
		flags: "i",
		confidence: "low",
	},
	{
		id: "loose-jwt",
		prefilter: /eyJ/,
		source: JWT,
		confidence: "low",
	},
	{
		id: "sensitive-assign",
		source: ASSIGN,
		flags: "i",
		confidence: "low",
	},
	{
		id: "cloud-env-var",
		source: CLOUD_ASSIGN,
		flags: "i",
		confidence: "low",
	},
	{
		id: "url-userinfo-tail",
		source: `:\\/\\/(\\[REDACTED\\](?!@|%40[^\\s"'>}|,;&${TICK})\\]@/]*(?:[\\s"'>}|,;&${TICK})\\]/]|$))[^\\s"'>}|,;&${TICK})\\]]*?(?=[\\s"'>}|,;&${TICK})\\]]|:\\/\\/|$))`,
		confidence: "low",
	},
	{
		id: "url-userinfo-later-at",
		source: `:\\/\\/(\\[REDACTED\\]@(?:[^\\s:/?#"'>}|,;&${TICK})\\]]|:(?!\\/\\/)){0,256})(?=@|%40)`,
		confidence: "low",
	},
	{
		id: "url-userinfo-encoded",
		source: `:\\/\\/((?:\\[REDACTED\\]@)?(?:(?:[^/?#@\\s"',;&<>|)\\]{}${TICK}[]*["'${TICK}<>{}[\\]][^/?#@\\s,;&|{}"'${TICK}<>[\\]()]*(?=%40))|[^/?#@\\s"',;&<>|)\\]}${TICK}[]+(?=%40)|(?=[^/?#@\\s"',;&<>|)\\]}${TICK}[]*?(?:%|:[^/?#@\\s"',;&<>|)\\]}${TICK}[]))[^/?#@\\s"',;&<>|)\\]}${TICK}[]+(?=\\[REDACTED\\])))`,
		confidence: "low",
	},
	{
		id: "masked-value-rest",
		source: `\\[REDACTED\\](${MASK_TAIL})`,
		confidence: "low",
	},
	{
		id: "anthropic-signed-key-rest",
		redactOnly: true,
		prefilter: /\[REDACTED\]\.eyJ/,
		source: "\\[REDACTED\\]\\.(eyJ[\\w-]+\\.[\\w-]+)",
		confidence: "low",
	},
	{
		id: "sensitive-assign-escaped",
		redactOnly: true,
		prefilter: ESCAPED_QUOTE,
		source: ESCAPED_ASSIGN,
		flags: "i",
		confidence: "low",
	},
];
