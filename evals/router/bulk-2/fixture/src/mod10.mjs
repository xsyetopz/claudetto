import { config } from "./config.mjs";

const {
  timeout_ms: limit = 1,
  // the connect step
  connect_timeout_ms: connect,
} = config;
export const t10 = () => limit + connect + 10;
