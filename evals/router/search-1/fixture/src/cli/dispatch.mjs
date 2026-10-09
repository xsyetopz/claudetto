import { HANDLERS } from "../time/handlers.mjs";

export const dispatch = (kind, text) => HANDLERS[kind](text);
