import { config } from "./config.mjs";

const timeout_ms = config.timeout_ms + 11;
export const t11 = () => ({ timeout_ms, label: `timeout_ms=${timeout_ms}` });
