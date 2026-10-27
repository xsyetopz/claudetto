import { access } from "node:fs/promises";

/** True when `at` exists, as a file, a folder, or a link that resolves. */
export const exists = async (at: string): Promise<boolean> => {
	try {
		await access(at);
		return true;
	} catch {
		return false;
	}
};
