#!/usr/bin/env bash
# Builds the fixture in the empty workspace: one module with eight functions that have a subtle security fault and four safe functions.
# The task is a review. `final.sh` checks the list that the model writes: all eight faults, and none of the safe functions.
set -euo pipefail
cat > package.json <<'EOT'
{
  "type": "module"
}
EOT
mkdir -p src
cat > src/app.mjs <<'EOT'
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const UPLOADS = "/srv/app/uploads";
const SECRET = crypto.randomBytes(32);

// Signs a value for a cookie. The cookie is `value.signature`.
export const sign = (value) =>
  value + "." + crypto.createHmac("sha256", SECRET).update(value).digest("hex");

// Checks the signature of a cookie, and returns the value or null.
export const unsign = (cookie) => {
  const at = cookie.lastIndexOf(".");
  const value = cookie.slice(0, at);
  const given = Buffer.from(cookie.slice(at + 1), "hex");
  const want = crypto.createHmac("sha256", SECRET).update(value).digest();
  return crypto.timingSafeEqual(given, want) ? value : null;
};

// Reads an uploaded file by its name from the upload folder.
export const readUpload = (name) => {
  const full = path.resolve(UPLOADS, name);
  if (!full.startsWith(UPLOADS + path.sep)) throw new Error("bad path");
  return fs.readFileSync(full, "utf8");
};

// The key of an entry in the shared cache of API answers.
export const cacheKey = (userId, resource) => `${userId}${resource}`;

// The price of an order line in cents.
export const lineTotal = (priceCents, quantityText) =>
  priceCents * parseInt(quantityText, 10);

// Finds the account of an email address. The store keeps the emails in lower case.
export const findAccount = (store, email) => store.get(email.toLowerCase());

// Makes a filter from the text of a search box, for the list of products.
export const productFilter = (text) => {
  const re = new RegExp(text, "i");
  return (product) => re.test(product.name);
};

// Writes one row of the export file that the staff open in a spreadsheet.
export const csvRow = (cells) =>
  cells.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",");

// Makes the token for a password reset link.
export const resetToken = (userId) =>
  crypto.createHash("sha256").update(userId + ":" + Date.now()).digest("hex");

// Hashes a password for storage.
export const hashPassword = (password) => {
  const salt = crypto.randomBytes(16);
  return salt.toString("hex") + ":" + crypto.scryptSync(password, salt, 64).toString("hex");
};

// Runs a report by its id from a fixed list.
const REPORTS = { daily: "daily.sql", weekly: "weekly.sql" };
export const reportFile = (id) => {
  if (!Object.hasOwn(REPORTS, id)) throw new Error("unknown report");
  return path.join("/srv/app/reports", REPORTS[id]);
};

// Escapes a text for an HTML page.
export const escapeHtml = (text) =>
  String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

// Makes the id of a session.
export const newSessionId = () => crypto.randomBytes(24).toString("base64url");
EOT
