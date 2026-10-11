// The upstream of `dotclaude-capture`: where the proxy forwards each request.

const DEFAULT = "https://api.anthropic.com";
const LOOPBACK = new Set(["127.0.0.1", "localhost", "[::1]"]);

/**
 * The upstream URL, without a trailing slash.
 * The order is the `--upstream` flag, then `baseUrl` (`ANTHROPIC_BASE_URL`), then the Anthropic API.
 * It throws when the URL is not valid, or when it is the address of the proxy (`port`), which is a loop.
 */
export function resolveUpstream({ flag, baseUrl, port }) {
  const text = (flag || baseUrl || DEFAULT).replace(/\/+$/, "");
  let url;
  try {
    url = new URL(text);
  } catch {
    throw new Error(`The upstream ${text} is not a valid URL.`);
  }
  const urlPort = url.port || (url.protocol === "https:" ? "443" : "80");
  if (LOOPBACK.has(url.hostname) && urlPort === String(port))
    throw new Error(
      `The upstream ${text} is the address of this proxy, so requests would loop. Pass --upstream URL, or unset ANTHROPIC_BASE_URL.`,
    );
  return text;
}
