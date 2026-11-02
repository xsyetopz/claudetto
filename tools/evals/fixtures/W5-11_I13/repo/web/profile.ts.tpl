import { fetchUser } from "../api.ts";

export const profileName = async (id: string): Promise<string> =>
	(await fetchUser(id)).name;
