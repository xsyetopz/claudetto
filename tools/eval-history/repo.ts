/** Source of the synthetic `tiny-cart` repo that the replayed session works on. */

/** The notes file of REPLY-145: 213 characters, 151 without the TODO line. */
export const NOTES = `Release checklist for tiny-cart 0.2.0
- bump the version in package.json
- TODO: decide whether the changelog lists internal refactors
- tag the release and push the tag
- announce the release in the team channel
`;

/** The config of REPLY-146: the port is 8080. */
export const CONFIG = `{ "port": 8080, "host": "127.0.0.1" }
`;

const PACKAGE_JSON = `{
  "name": "tiny-cart",
  "version": "0.2.0",
  "type": "module",
  "scripts": { "test": "bun test" }
}
`;

/** Pricing domains: one module and one test file each. */
export const MODULES: readonly { name: string; nouns: readonly string[] }[] = [
	{
		name: "tax",
		nouns: ["sales", "vat", "excise", "levy", "duty", "surcharge"]
	},
	{
		name: "discount",
		nouns: ["bulk", "loyalty", "seasonal", "clearance", "bundle", "staff"]
	},
	{
		name: "shipping",
		nouns: ["ground", "express", "freight", "pickup", "island", "oversize"]
	},
	{
		name: "inventory",
		nouns: ["reserve", "backorder", "restock", "shrink", "transfer", "audit"]
	},
	{
		name: "coupon",
		nouns: ["percent", "fixed", "freeship", "firstorder", "referral", "winback"]
	},
	{
		name: "checkout",
		nouns: ["payment", "fraud", "retry", "capture", "refund", "settle"]
	},
	{
		name: "receipt",
		nouns: ["header", "footer", "itemline", "summary", "barcode", "locale"]
	},
	{
		name: "loyalty",
		nouns: ["earn", "burn", "tier", "expire", "bonus", "merge"]
	},
	{
		name: "currency",
		nouns: ["convert", "round", "spread", "peg", "hedge", "display"]
	},
	{
		name: "returns",
		nouns: ["window", "restock", "fee", "label", "credit", "inspect"]
	},
	{
		name: "bundle",
		nouns: ["kit", "pair", "tier", "mixmatch", "gift", "upsell"]
	},
	{
		name: "audit",
		nouns: ["trail", "diff", "redact", "retain", "export", "sign"]
	}
];

const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
const upper = (s: string): string => s.toUpperCase();

function rateOf(index: number, offset: number): string {
	return (0.01 * (((index * 7 + offset * 3) % 19) + 2)).toFixed(2);
}

function fn(noun: string, index: number, offset: number): string {
	const N = upper(noun);
	const C = cap(noun);
	return `
/**
 * Computes the ${noun} amount for one line item.
 *
 * @param {LineItem} item The priced line.
 * @param {Options} [options] Per-call overrides.
 * @returns {number} The amount in cents, never negative.
 */
export function compute${C}(item, options = {}) {
  const base = item.unitPrice * item.quantity;
  if (base <= 0) {
    return 0;
  }
  const rate = options.${noun}Rate ?? DEFAULT_${N}_RATE;
  const raw = base * rate + FLAT_${N}_CENTS;
  const capped = Math.min(raw, MAX_${N}_CENTS);
  if (options.${noun}Floor !== undefined && capped < options.${noun}Floor) {
    return options.${noun}Floor;
  }
  return roundCents(capped + ${(index + offset) % 4});
}

/**
 * Tells whether a cart qualifies for the ${noun} rule.
 *
 * @param {Cart} cart The cart under review.
 * @returns {boolean} True when the rule applies.
 */
export function qualifiesFor${C}(cart) {
  const lines = cart.lines.filter((line) => line.quantity >= MIN_${N}_QUANTITY);
  if (lines.length === 0) {
    return false;
  }
  return lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0) >= ${100 * (index + 1 + offset)};
}
`;
}

function moduleSource(
	mod: { name: string; nouns: readonly string[] },
	index: number
): string {
	const consts = mod.nouns
		.map(
			(noun, i) =>
				`export const DEFAULT_${upper(noun)}_RATE = ${rateOf(index, i)};\nexport const FLAT_${upper(noun)}_CENTS = ${(index + i) % 5};\nexport const MAX_${upper(noun)}_CENTS = ${(index + 1) * 1000 * (i + 1)};\nexport const MIN_${upper(noun)}_QUANTITY = ${(i % 3) + 1};`
		)
		.join("\n");
	const fns = mod.nouns.map((noun, i) => fn(noun, index, i)).join("");
	return `import { roundCents } from "./money.js";

/** @typedef {{ unitPrice: number, quantity: number, sku: string }} LineItem */
/** @typedef {{ lines: LineItem[], region?: string }} Cart */
/** @typedef {Record<string, number | undefined>} Options */

${consts}
${fns}
export function summarize${cap(mod.name)}(cart, options = {}) {
  let total = 0;
  for (const line of cart.lines) {
${mod.nouns.map((n) => `    total += compute${cap(n)}(line, options);`).join("\n")}
  }
  return roundCents(total);
}
`;
}

function testSource(mod: { name: string; nouns: readonly string[] }): string {
	const cases = mod.nouns
		.map(
			(n, i) => `
  test("${n} is zero for an empty line", () => {
    expect(pricing.compute${cap(n)}({ sku: "A${i}", unitPrice: 0, quantity: 3 })).toBe(0);
  });

  test("${n} grows with the quantity", () => {
    const one = pricing.compute${cap(n)}({ sku: "A${i}", unitPrice: 1000, quantity: 1 });
    const two = pricing.compute${cap(n)}({ sku: "A${i}", unitPrice: 1000, quantity: 2 });
    expect(two).toBeGreaterThanOrEqual(one);
  });`
		)
		.join("\n");
	return `import { describe, expect, test } from "bun:test";
import * as pricing from "../src/${mod.name}.js";

describe("${mod.name}", () => {${cases}
});
`;
}

const MONEY = `/**
 * Rounds a cent amount half away from zero.
 *
 * @param {number} cents The unrounded amount.
 * @returns {number} Whole cents.
 */
export function roundCents(cents) {
  return Math.sign(cents) * Math.round(Math.abs(cents));
}
`;

const README = `# tiny-cart

A small cart-pricing library with a demo server.

Serves on port 8080 (see \`config.json\`).

## Layout

- \`src/\` one module per pricing concern (tax, discount, shipping, and so on)
- \`test/\` one test file per module, run with \`bun test\`
- \`notes.txt\` the release checklist
`;

/** Every file of the repo, by path, in the state the session ends in before any edit of the final turn. */
export function initialFiles(): Map<string, string> {
	const files = new Map<string, string>([
		["package.json", PACKAGE_JSON],
		["README.md", README],
		["config.json", CONFIG],
		["notes.txt", NOTES],
		["src/money.js", MONEY]
	]);
	for (const [index, mod] of MODULES.entries()) {
		files.set(`src/${mod.name}.js`, moduleSource(mod, index));
		files.set(`test/${mod.name}.test.js`, testSource(mod));
	}
	return files;
}
