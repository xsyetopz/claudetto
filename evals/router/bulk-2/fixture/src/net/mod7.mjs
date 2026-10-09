import { config } from "../config.mjs";

export const t7 = () => config.net.timeout_ms + 7;
export const c7 = () => config.connect_timeout_ms + 7;
