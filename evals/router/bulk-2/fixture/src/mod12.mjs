import { config } from "./config.mjs";

export const t12 = () =>
  Number(process.env.TIMEOUT_MS ?? config.timeout_ms) + 12;
export const m12 = () => config.timeout_ms_max;
