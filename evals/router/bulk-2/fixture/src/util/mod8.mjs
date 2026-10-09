import fs from "node:fs";
import { validate } from "../config.mjs";

const defaults = JSON.parse(
  fs.readFileSync(new URL("../defaults.json", import.meta.url), "utf8"),
);
export const t8 = () => validate({ ...defaults, retries: 1 }).timeout_ms + 8;
