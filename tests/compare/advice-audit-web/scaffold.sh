#!/usr/bin/env bash
# Builds the fixture in the empty workspace: one module with six functions that have a subtle security fault and four safe functions.
# The task is a review. `final.sh` checks the list that the model writes: all six faults, and none of the safe functions.
set -euo pipefail
cat > package.json <<'EOT'
{
  "type": "module"
}
EOT
mkdir -p src
cat > src/web.mjs <<'EOT'
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const BASE = new URL("https://app.example.com/");
const SECRET = crypto.randomBytes(32);

// Gives the payload of a token `header.payload.signature` (base64url JSON, and an HMAC of the first two parts), or null. A token lives until its `exp` (seconds).
export const verifyToken = (token) => {
  const [h, p, s] = token.split(".");
  const want = crypto.createHmac("sha256", SECRET).update(`${h}.${p}`).digest("base64url");
  if (want.length !== s.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(want), Buffer.from(s))) return null;
  return JSON.parse(Buffer.from(p, "base64url"));
};

// Checks the 6 digit code that a user typed against the code that was sent by mail.
export const codeOk = (typed, sent) => Number(typed) === Number(sent);

// Writes one entry of an uploaded archive below the folder `dir`.
export const extractFile = (dir, entry) => {
  const target = path.resolve(dir, entry.name);
  if (!target.startsWith(path.resolve(dir) + path.sep)) throw new Error("bad name");
  fs.writeFileSync(target, entry.data);
  fs.chmodSync(target, entry.mode);
  return target;
};

// Gives the invoice of a number from the address of a page. The route checked that the caller owns the invoice before this call.
const INVOICES = new Map();
export const getInvoice = (idText) => INVOICES.get(Number(idText));

// Gives the script tag that hands data to the page.
export const inlineData = (data) => `<script>window.DATA = ${JSON.stringify(data)};</script>`;

// Makes the header that offers a stored file as a download under the name the user gave it.
export const downloadHeader = (name) => `Content-Disposition: attachment; filename="${name}"`;

// Checks the signature of a webhook call (hex HMAC of the body) against the header.
export const webhookOk = (body, header) => {
  const want = crypto.createHmac("sha256", SECRET).update(body).digest();
  const got = Buffer.from(String(header), "hex");
  return got.length === want.length && crypto.timingSafeEqual(got, want);
};

// Checks a secret that a user typed against the stored secret.
export const secretOk = (typed, stored) => {
  const a = crypto.createHash("sha256").update(String(typed)).digest();
  const b = crypto.createHash("sha256").update(String(stored)).digest();
  return crypto.timingSafeEqual(a, b);
};

// Escapes a text for a value of an HTML attribute in double quotes.
export const escapeAttr = (text) =>
  String(text).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");

// The id of a new invoice.
export const invoiceId = () => crypto.randomUUID();
EOT
