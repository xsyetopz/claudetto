import * as lib from "./lib.mjs";

const { fetchUser: get, refetchUser } = lib;
export const u10 = () => `${get(10)}/${refetchUser(10)}`;
