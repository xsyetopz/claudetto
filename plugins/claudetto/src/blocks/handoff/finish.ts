import { redact } from "../../shared/secrets/redact.ts";

/** The model is asked to write `[REDACTED]`, and a key it wrote anyway must not reach the file or the next context. */
export const finished = (reply: string): string => redact(reply);
