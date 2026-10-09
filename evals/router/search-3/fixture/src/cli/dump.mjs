import * as security from "../security/index.mjs";

export const dump = (text) => security["redact" + "Secrets"](text);
