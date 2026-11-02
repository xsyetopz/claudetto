export interface Item {
	id: number;
}

export const sync = async (base: string): Promise<Item[]> => {
	const response = await fetch(`${base}/items`);
	return (await response.json()) as Item[];
};
