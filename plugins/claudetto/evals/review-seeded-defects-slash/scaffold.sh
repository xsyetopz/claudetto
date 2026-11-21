#!/usr/bin/env bash
# Scaffold: a tiny-cart repo with one commit and an uncommitted working diff.
# The diff holds 5 seeded defects (D1 to D5) and 3 benign changes (B1 to B3). Offline and deterministic.
# The line numbers in graders/ are the lines of the changed files as written below.
set -euo pipefail

mkdir src

cat > src/cart.js <<'JS'
export const MAX_ITEMS = 50;

export function cartTotal(items) {
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    total += items[i].price * items[i].qty;
  }
  return total;
}

export function applyCoupon(total, coupon) {
  if (coupon && !coupon.expired) {
    return total - total * coupon.rate;
  }
  return total;
}
JS

cat > src/config.js <<'JS'
export const config = {
  timeout_ms: 5000,
  retries: 3,
};
JS

cat > src/db.js <<'JS'
const rows = [];

export const db = {
  async write(order) {
    await new Promise((resolve) => setTimeout(resolve, 10));
    rows.push(order);
  },
  count() {
    return rows.length;
  },
};
JS

cat > src/store.js <<'JS'
import { cartTotal, MAX_ITEMS } from "./cart.js";
import { config } from "./config.js";
import { db } from "./db.js";

export async function saveOrder(items) {
  if (items.length > MAX_ITEMS) {
    throw new Error("too many items");
  }
  const order = { items, total: cartTotal(items) };
  await db.write(order);
  return { ok: true, total: order.total };
}

export function requestTimeout() {
  return config.timeout_ms;
}
JS

cat > src/users.js <<'JS'
export const users = [
  { id: 1, email: "Ann@example.com" },
  { id: 2, email: "Bo@example.com" },
];
JS

git init -q -b main
git add -A
git -c user.name=eval -c user.email=eval@example.invalid commit -q -m "chore: initial cart"

# D1 (off-by-one): the loop bound reads one past the last item.
# D2 (inverted condition): the coupon applies only when it has expired.
# B1 (benign): MAX_ITEMS is renamed to MAX_CART_ITEMS, and its one use follows.
cat > src/cart.js <<'JS'
export const MAX_CART_ITEMS = 50;

export function cartTotal(items) {
  let total = 0;
  for (let i = 0; i <= items.length; i++) {
    total += items[i].price * items[i].qty;
  }
  return total;
}

export function applyCoupon(total, coupon) {
  if (coupon && coupon.expired) {
    return total - total * coupon.rate;
  }
  return total;
}
JS

# B2 (benign): a comment and a key order change, with the same values.
cat > src/config.js <<'JS'
// Request settings, in milliseconds and attempts.
export const config = {
  retries: 3,
  timeout_ms: 5000,
};
JS

# D3 (unawaited promise): the write is not awaited, so a failed write still reports ok.
# D4 (wrong key): the config key is timeout_ms, so this returns undefined.
cat > src/store.js <<'JS'
import { cartTotal, MAX_CART_ITEMS } from "./cart.js";
import { config } from "./config.js";
import { db } from "./db.js";

export async function saveOrder(items) {
  if (items.length > MAX_CART_ITEMS) {
    throw new Error("too many items");
  }
  const order = { items, total: cartTotal(items) };
  db.write(order);
  return { ok: true, total: order.total };
}

export function requestTimeout() {
  return config.timeoutMs;
}
JS

# D5 (missed null case): a guest id is not in users, so find returns undefined.
cat > src/mail.js <<'JS'
import { users } from "./users.js";

// Called for every order, including guest orders whose id is not in users.
export function receiptAddress(id) {
  const user = users.find((u) => u.id === id);
  return user.email.toLowerCase();
}
JS

# B3 (benign): a new correct helper that nothing calls yet.
cat > src/format.js <<'JS'
export function formatPrice(cents) {
  const whole = Math.floor(cents / 100);
  const part = String(cents % 100).padStart(2, "0");
  return `$${whole}.${part}`;
}
JS
