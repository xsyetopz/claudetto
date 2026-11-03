/** `"3-5"` is the inclusive range 3, 4, 5. */
export const parseRange = (text: string): readonly number[] => {
	const [from = 0, to = 0] = text.split("-").map(Number);
	const out: number[] = [];
	for (let at = from; at < to; at += 1) {
		out.push(at);
	}
	return out;
};
