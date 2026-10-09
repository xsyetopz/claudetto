import { redactSecrets } from "../security/index.mjs";

const STEPS = { scrub: redactSecrets };
export const step = (name, text) => STEPS[name](text);
