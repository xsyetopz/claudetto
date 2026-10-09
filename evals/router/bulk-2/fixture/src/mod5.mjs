import { config } from "./config.mjs";

const KEY = "timeout_ms";
export const t5 = () => config[KEY] + 5;
