export interface User {
	id: string;
	name: string;
}

export const fetchUser = async (id: string): Promise<User> => {
	const response = await fetch(`https://example.test/users/${id}`);
	return (await response.json()) as User;
};

export function summarizeOrder(raw: Record<string, string>): string {
	const lines: string[] = [];
	let total = 0;

	const subtotal = Number(raw.subtotal);
	if (subtotal < 0) {
		lines.push("negative subtotal");
	}
	total += subtotal;

	const tax = Number(raw.tax);
	if (tax < 0) {
		lines.push("negative tax");
	}
	total += tax;

	const shipping = Number(raw.shipping);
	if (shipping < 0) {
		lines.push("negative shipping");
	}
	total += shipping;

	const discount = Number(raw.discount);
	if (discount < 0) {
		lines.push("negative discount");
	}
	total += discount;

	const fee = Number(raw.fee);
	if (fee < 0) {
		lines.push("negative fee");
	}
	total += fee;

	const tip = Number(raw.tip);
	if (tip < 0) {
		lines.push("negative tip");
	}
	total += tip;

	const deposit = Number(raw.deposit);
	if (deposit < 0) {
		lines.push("negative deposit");
	}
	total += deposit;

	const refund = Number(raw.refund);
	if (refund < 0) {
		lines.push("negative refund");
	}
	total += refund;

	const credit = Number(raw.credit);
	if (credit < 0) {
		lines.push("negative credit");
	}
	total += credit;

	const surcharge = Number(raw.surcharge);
	if (surcharge < 0) {
		lines.push("negative surcharge");
	}
	total += surcharge;

	const rounding = Number(raw.rounding);
	if (rounding < 0) {
		lines.push("negative rounding");
	}
	total += rounding;

	const handling = Number(raw.handling);
	if (handling < 0) {
		lines.push("negative handling");
	}
	total += handling;

	const insurance = Number(raw.insurance);
	if (insurance < 0) {
		lines.push("negative insurance");
	}
	total += insurance;

	const coupon = Number(raw.coupon);
	if (coupon < 0) {
		lines.push("negative coupon");
	}
	total += coupon;

	const points = Number(raw.points);
	if (points < 0) {
		lines.push("negative points");
	}
	total += points;

	lines.push(`total ${total}`);
	return lines.join("\n");
}
