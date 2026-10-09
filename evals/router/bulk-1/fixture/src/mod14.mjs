import { fetchUser } from "./lib.mjs";

// `$fetchUser` and `fetchUser$` are other names, and they stay.
const $fetchUser = 14;
const fetchUser$ = fetchUser($fetchUser);
export const u14 = () => fetchUser$;
