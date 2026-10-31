import { HAIKU_PRICE_STEP } from "../../tiers/tiers.ts";

const count = (n: number): string => n.toLocaleString("en-US");

export const WITHHELD = (v: { tokens: number; total: number }): string =>
	`The result is about ${count(v.tokens)} tokens, and with it the next request would be about ${count(v.total)}, over the ${count(HAIKU_PRICE_STEP)} above which Haiku 5.5 bills the whole request at five times. The call ran, so do not repeat a change it made. Ask for a smaller part: a line range of a file, a narrower search, or output cut with \`head\` or \`grep\`.`;
