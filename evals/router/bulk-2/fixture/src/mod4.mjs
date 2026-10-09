import { config } from "./config.mjs";

const { timeout_ms: limit, connect_timeout_ms: connect } = config;
export const t4 = () => limit + 4 + connect * 0;
