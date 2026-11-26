#!/usr/bin/env bash
# Scaffold: a tiny-shop repo with one commit and an uncommitted working diff over 10 files.
# The diff holds 7 seeded defects (D1 to D7) and 5 benign changes that look suspicious (B1 to B5).
# D7 shows only against src/receipt.js, which the diff does not touch. Offline and deterministic.
# The line numbers in graders/ are the lines of the changed files as written below.
set -euo pipefail
mkdir src
cat > src/page.js <<'JS'
// Pagination helpers for the order list. Pages count from 1.
export function pageOf(items, page, size) {
  const start = (page - 1) * size;
  return items.slice(start, start + size);
}

export function pageCount(total, size) {
  return Math.ceil(total / size);
}

export function pageTotals(items, size) {
  const totals = [];
  for (let i = 0; i < items.length; i += size) {
    totals.push(items.slice(i, i + size).reduce((sum, item) => sum + item.cents, 0));
  }
  return totals;
}
JS
cat > src/sort.js <<'JS'
// Returns a sorted copy of the products, cheapest first.
export function byPrice(products) {
  return [...products].sort((a, b) => a.cents - b.cents);
}
JS
cat > src/qty.js <<'JS'
// Reads the quantity field of the cart form. 0 is legal: it removes the line.
export function readQty(input) {
  const n = Number(input);
  if (Number.isNaN(n)) return 1;
  return Math.trunc(n);
}

export function hasQty(line) {
  return line.qty !== null && line.qty !== undefined;
}
JS
cat > src/dates.js <<'JS'
// Parses "YYYY-MM-DD" from the order export into a local Date.
export function parseDay(text) {
  const [year, month, day] = text.split("-").map(Number);
  return new Date(year, month - 1, day);
}
JS
cat > src/options.js <<'JS'
const DEFAULTS = { currency: "EUR", retries: 3, timeoutMs: 5000 };

// Caller options win over the defaults.
export function withDefaults(options) {
  return { ...DEFAULTS, ...options };
}
JS
cat > src/format.js <<'JS'
// Formats non-negative integer cents, such as 1250 and "EUR", as "12.50 EUR".
export function formatPrice(cents, currency) {
  const whole = Math.floor(cents / 100);
  const rest = String(cents % 100).padStart(2, "0");
  return `${whole}.${rest} ${currency}`;
}
JS
cat > src/receipt.js <<'JS'
import { formatPrice } from "./format.js";

export function receiptLines(lines, currency) {
  return lines.map((line) => `${line.name}: ${formatPrice(line.cents, currency)}`);
}
JS
cat > src/limits.js <<'JS'
export const MAX_ITEMS = 50;
JS
cat > src/store.js <<'JS'
import { MAX_ITEMS } from "./limits.js";

export function addLine(cart, line) {
  if (cart.lines.length >= MAX_ITEMS) {
    throw new Error("cart is full");
  }
  return { ...cart, lines: [...cart.lines, line] };
}
JS
git init -q -b main
git add -A
git -c user.name=eval -c user.email=eval@example.invalid commit -q -m "chore: initial shop"

# D1 (line 4): the slice end drops the last item of every page.
# B1 (line 13): `i <= items.length - 1` is the same bound as `i < items.length`.
cat > src/page.js <<'JS'
// Pagination helpers for the order list. Pages count from 1.
export function pageOf(items, page, size) {
  const start = (page - 1) * size;
  return items.slice(start, start + size - 1);
}

export function pageCount(total, size) {
  return Math.ceil(total / size);
}

export function pageTotals(items, size) {
  const totals = [];
  for (let i = 0; i <= items.length - 1; i += size) {
    totals.push(items.slice(i, i + size).reduce((sum, item) => sum + item.cents, 0));
  }
  return totals;
}
JS
# D2 (line 3): the comparator returns a boolean, so the sort never moves a cheaper item forward.
cat > src/sort.js <<'JS'
// Returns a sorted copy of the products, cheapest first.
export function byPrice(products) {
  return [...products].sort((a, b) => a.cents > b.cents);
}
JS
# D3 (line 3): `|| 1` turns the legal quantity 0 into 1.
# B2 (line 8): `!= null` covers null and undefined, as before.
cat > src/qty.js <<'JS'
// Reads the quantity field of the cart form. 0 is legal: it removes the line.
export function readQty(input) {
  const n = Number(input) || 1;
  return Math.trunc(n);
}

export function hasQty(line) {
  return line.qty != null;
}
JS
# D4 (lines 1 and 5, new file): a global regex keeps lastIndex, so a second valid code tests false.
cat > src/sku.js <<'JS'
const SKU = /^[A-Z]{3}-\d{4}$/g;

// True when the text is a stock code such as ABC-1234.
export function isSku(text) {
  return SKU.test(text);
}
JS
# D5 (line 4): the month from the text is 1-based and Date wants 0-based.
cat > src/dates.js <<'JS'
// Parses "YYYY-MM-DD" from the order export into a local Date.
export function parseDay(text) {
  const [year, month, day] = text.split("-").map(Number);
  return new Date(year, month, day);
}
JS
# B3 (line 1): the key order of DEFAULTS changes, with the same values.
# D6 (line 5): the defaults now overwrite the caller's options.
cat > src/options.js <<'JS'
const DEFAULTS = { retries: 3, timeoutMs: 5000, currency: "EUR" };

// Caller options win over the defaults.
export function withDefaults(options) {
  return { ...options, ...DEFAULTS };
}
JS
# D7 (line 2): the parameters swap, and src/receipt.js line 4 still passes (cents, currency).
cat > src/format.js <<'JS'
// Formats non-negative integer cents, such as 1250 and "EUR", as "12.50 EUR".
export function formatPrice(currency, cents) {
  const whole = Math.floor(cents / 100);
  const rest = String(cents % 100).padStart(2, "0");
  return `${whole}.${rest} ${currency}`;
}
JS
# B4: MAX_ITEMS is renamed to MAX_CART_ITEMS, and its one use follows.
cat > src/limits.js <<'JS'
export const MAX_CART_ITEMS = 50;
JS
cat > src/store.js <<'JS'
import { MAX_CART_ITEMS } from "./limits.js";

export function addLine(cart, line) {
  if (cart.lines.length >= MAX_CART_ITEMS) {
    throw new Error("cart is full");
  }
  return { ...cart, lines: [...cart.lines, line] };
}
JS
# B5 (new file): a correct helper that nothing calls yet.
cat > src/money.js <<'JS'
// Adds integer cents.
export function sumCents(values) {
  let total = 0;
  for (const value of values) {
    total += value;
  }
  return total;
}
JS
