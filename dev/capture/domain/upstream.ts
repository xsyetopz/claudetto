import { UPSTREAM_INVALID, UPSTREAM_LOOP } from "../prompts.ts";

const TRAILING_SLASHES = /\/+$/;

const DEFAULT = "https://api.anthropic.com";
const LOOPBACK = new Set(["127.0.0.1", "localhost", "[::1]"]);

export const resolveUpstream = ({
	flag,
	baseUrl,
	port,
}: {
	flag?: string | null;
	baseUrl?: string;
	port: number;
}): string => {
	const text = (flag || baseUrl || DEFAULT).replace(TRAILING_SLASHES, "");
	let url: URL | undefined;
	try {
		url = new URL(text);
	} catch (e) {
		throw new Error(UPSTREAM_INVALID({ text }), { cause: e });
	}
	const urlPort = url.port || (url.protocol === "https:" ? "443" : "80");
	if (LOOPBACK.has(url.hostname) && urlPort === String(port)) {
		throw new Error(UPSTREAM_LOOP({ text }));
	}
	return text;
};
