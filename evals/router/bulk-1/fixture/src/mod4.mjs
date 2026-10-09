import { fetchUser, fetchUserCache } from "./lib.mjs";
export const u4 = () => `${fetchUser(4)}/${fetchUserCache(4)}`;
