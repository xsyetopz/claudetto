#!/usr/bin/env bash
# Scaffold: a password validator whose spec (PWD-1) says 12. The README is stale and says 8, and
# specs/account.md holds two planned requirements that say 8 about other things. Offline and deterministic.
set -euo pipefail

mkdir -p src specs
cat > package.json <<'JSON'
{
  "name": "tiny-password",
  "private": true,
  "type": "module",
  "scripts": { "test": "bun test" }
}
JSON
cat > src/password.ts <<'TS'
export const MIN_LENGTH = 12;

export function isValidPassword(password: string): boolean {
	return password.length >= MIN_LENGTH;
}
TS
cat > src/password.test.ts <<'TS'
import { expect, test } from "bun:test";
import { isValidPassword } from "./password";

test("accepts a 12-character password", () => {
	expect(isValidPassword("abcdefghijkl")).toBe(true);
});

test("PWD-1 rejects an 11-character password", () => {
	expect(isValidPassword("abcdefghijk")).toBe(false);
});
TS
cat > specs/password.md <<'MD'
# Password

## PWD-1 Passwords have at least 12 characters

A password shorter than 12 characters is rejected.

Given a password of 11 characters
When it is validated
Then it is rejected
MD
cat > specs/account.md <<'MD'
# Account

Planned for 0.4. Nothing here is built yet.

## ACCT-1 Usernames have at least 8 characters

A username shorter than 8 characters is rejected.

## ACCT-2 Recovery codes have 8 digits

A recovery code is exactly 8 digits.
MD
cat > README.md <<'MD'
# tiny-password

Password rules for the sign-up form. Passwords need 8 or more characters.

Run the tests with `bun test`.
MD

git init -q -b main
git add -A
git -c user.name=eval -c user.email=eval@example.invalid commit -q -m "chore: initial project"
