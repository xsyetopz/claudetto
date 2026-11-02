import { fetchUser } from "../api.ts";

export const avatarUrl = async (id: string): Promise<string> => {
	const user = await fetchUser(id);
	return `https://example.test/avatars/${user.id}.png`;
};
