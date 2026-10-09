import { redactSecrets } from "../log/redact.mjs";

// TODO: `unredactSecrets` for the debug page.
export const handle = (req) => redactSecrets(req.url);
