import { isChallenge, needsRender } from "./detect";
import { extractPage } from "./markdown";

/** What a plain HTTP request answers with. */
export interface NetResponse {
	status: number;
	headers: Record<string, string>;
	text: string;
}

/** What one response body turned out to be. */
export type Body =
	| { kind: "ok"; markdown: string }
	| { kind: "render"; why: string }
	| { kind: "challenge" }
	| { kind: "final"; message: string };

/** Statuses a headless render may get past; any other 4xx is the page's real answer. */
const RENDERABLE = new Set([401, 403, 407, 408, 425, 429]);

/** Content types served as text and passed through unchanged. */
const TEXTUAL =
	/^(?:text\/|application\/(?:json|[\w.+-]*\+json|javascript|ld\+json|x-ndjson))/iu;

const isHtml = (type: string, text: string): boolean =>
	/html|xml/iu.test(type) || /^\s*(?:<!doctype html|<html)/iu.test(text);

function readFailure(res: NetResponse, url: string, html: boolean): Body {
	if (html && isChallenge(res.text, 0)) {
		return { kind: "challenge" };
	}
	return RENDERABLE.has(res.status) || res.status >= 500
		? { kind: "render", why: `HTTP ${res.status}` }
		: { kind: "final", message: `HTTP ${res.status} from ${url}` };
}

/**
 * Classifies one response: content, a need for a browser, a challenge, or a
 * final answer the page itself gave.
 *
 * @param res The response.
 * @param url The URL it answered.
 */
export function readBody(res: NetResponse, url: string): Body {
	const type = res.headers["content-type"] ?? "";
	const html = isHtml(type, res.text);
	if (res.status < 200 || res.status >= 300) {
		return readFailure(res, url, html);
	}
	if (!html) {
		return type !== "" && !TEXTUAL.test(type)
			? { kind: "final", message: `Unsupported content type ${type}: ${url}` }
			: { kind: "ok", markdown: res.text };
	}
	const page = extractPage(res.text, url);
	if (isChallenge(res.text, page.markdown.length)) {
		return { kind: "challenge" };
	}
	if (needsRender(res.text, page.markdown.length)) {
		return { kind: "render", why: "no readable content" };
	}
	return { kind: "ok", markdown: page.markdown };
}

/** Classifies the DOM a headless render printed; undefined means the render failed. */
export function readDom(
	dom: string | undefined,
	url: string
): Body | undefined {
	return dom === undefined
		? undefined
		: readBody(
				{ status: 200, headers: { "content-type": "text/html" }, text: dom },
				url
			);
}
