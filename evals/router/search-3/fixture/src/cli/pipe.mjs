import { redactSecrets } from "../security/index.mjs";

export const pipe = (lines) => lines.map(redactSecrets);
