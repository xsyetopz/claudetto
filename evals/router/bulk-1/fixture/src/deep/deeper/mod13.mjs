const lib = await import("../../lib.mjs");

export const u13 = () => lib.fetchUser(13);
export const list13 = () => lib.fetchUsers([13, 14]);
