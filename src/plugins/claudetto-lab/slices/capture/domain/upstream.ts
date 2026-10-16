// The upstream of `claudetto-capture`: where the proxy forwards each request.

import { UPSTREAM_INVALID, UPSTREAM_LOOP } from "../prompts.ts";

const DEFAULT = "https://api.anthropic.com";
const LOOPBACK = new Set(["127.0.0.1", "localhost", "[::1]"]);

/**
 * The upstream URL, without a trailing slash.
 * The order is the `--upstream` flag, then `baseUrl` (`ANTHROPIC_BASE_URL`), then the Anthropic API.
 * It throws when the URL is not valid, or when it is the address of the proxy (`port`), which is a loop.
 */
export const resolveUpstream = ({
  flag,
  baseUrl,
  port,
}: {
  flag?: string | null;
  baseUrl?: string;
  port: number;
}): string => {
  const text = (flag || baseUrl || DEFAULT).replace(/\/+$/, "");
  let url: URL | undefined;
  try {
    url = new URL(text);
  } catch {
    throw new Error(UPSTREAM_INVALID({ text }));
  }
  const urlPort = url.port || (url.protocol === "https:" ? "443" : "80");
  if (LOOPBACK.has(url.hostname) && urlPort === String(port))
    throw new Error(UPSTREAM_LOOP({ text }));
  return text;
};
