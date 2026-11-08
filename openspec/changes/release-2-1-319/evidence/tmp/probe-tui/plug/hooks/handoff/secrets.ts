const REDACTED = "[REDACTED]";

const KEY_BLOCK =
	/-----BEGIN[ A-Z0-9_-]{0,100}?PRIVATE KEY(?: BLOCK)?-----[\s\S]*?(?:-----END[ A-Z0-9_-]{0,100}?PRIVATE KEY(?: BLOCK)?-----|$)/g;

/** The whole match is a token: each pattern is a vendor's documented prefix and body. */
const TOKENS = [
	/\bsk-ant-[\w-]{10,}/g,
	/\bsk-[A-Za-z0-9_-]{20,}/g,
	/\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{30,}/g,
	/\bgithub_pat_[A-Za-z0-9_]{50,}/g,
	/\bglpat-[\w-]{20,}/g,
	/\b(?:AKIA|ASIA|ABIA|ACCA)[A-Z2-7]{16}\b/g,
	/\bAIza[\w-]{35}/g,
	/\bxox[abposr]-[A-Za-z0-9-]{10,}/g,
	/\beyJ[\w-]{8,}\.eyJ[\w-]{8,}\.[\w-]{8,}/g,
	/\b(?:Bearer|Basic)\s+[A-Za-z0-9._~+/=-]{16,}/g,
];

/** The value is the second group: a name that says secret, then `=` or `:`. */
const ASSIGNMENT =
	/(\b[\w-]*(?:secret|password|passwd|token|api[_-]?key|private[_-]?key)[\w-]*["']?\s*[:=]\s*)(?:"[^"\n]+"|'[^'\n]+'|[^\s"',;]+)/gi;

const USERINFO = /(:\/\/[^/@\s:]+:)[^/@\s]+(?=@)/g;

export const redact = (text: string): string => {
	let out = text
		.replace(KEY_BLOCK, REDACTED)
		.replace(USERINFO, `$1${REDACTED}`)
		.replace(ASSIGNMENT, `$1${REDACTED}`);
	for (const pattern of TOKENS) {
		out = out.replace(pattern, REDACTED);
	}
	return out;
};
