export const config = {
  timeout_ms: 500,
  connect_timeout_ms: 50,
  timeout_ms_max: 900,
  retries: 2,
  net: { timeout_ms: 700 },
};

// A key in this list must be in the config.
export const REQUIRED = ["timeout_ms", "retries"];

export function validate(c) {
  for (const k of REQUIRED)
    if (!(k in c)) throw new Error(`missing key: ${k}`);
  return c;
}
