import { redactSecrets } from "../security/scrub/strict.mjs";

export const report = (line) => redactSecrets(line);
