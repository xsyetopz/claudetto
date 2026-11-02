import { fetchUser } from "../api.ts";

export const greeting = async (id: string): Promise<string> => {
	const user = await fetchUser(id);
	return `Hello, ${user.name}`;
};
