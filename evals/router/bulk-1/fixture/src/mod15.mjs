import {
  // the loader of one user
  fetchUser, // by id
  fetchUsers,
} from "./lib.mjs";

export const u15 = () => `${fetchUser(15)}+${fetchUsers([15]).length}`;
