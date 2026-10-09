import { load } from "./config/load.mjs";

const RETRIES = 3;

export async function get(url, file) {
  const { host, timeoutMs } = load(file);
  let last;
  for (let i = 0; i < RETRIES; i++) {
    try {
      return await fetch(`${host}${url}`, {
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      last = err;
    }
  }
  throw last;
}
