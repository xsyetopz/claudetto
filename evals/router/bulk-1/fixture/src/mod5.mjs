import * as lib from "./lib.mjs";

// Calls `fetchUser` by name, so the string must follow the rename.
const NAME = "fetchUser";
export const u5 = () => lib[NAME](5);
