/**
 * @see {@link fetchUser} for the text of one user.
 */
export const fetchUser = (id) => `user-${id}`;
export const fetchUserCache = (id) => `cache-${id}`;
export const fetchUsers = (ids) => ids.map(fetchUser);
export const prefetchUser = (id) => `pre-${id}`;
export const refetchUser = (id) => `re-${id}`;
