export const getStatus = async (url: string): Promise<number> => {
	const response = await fetch(url);
	return response.status;
};
