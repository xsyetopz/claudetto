import { redactSecrets } from "./redact.mjs";

export const write = (line) => process.stdout.write(`${redactSecrets(line)}\n`);
