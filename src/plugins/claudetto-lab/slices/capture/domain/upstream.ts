import { UPSTREAM_INVALID, UPSTREAM_LOOP } from "../prompts.ts";

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
