#!/usr/bin/env bash
# Scaffold: a tiny Bun password-policy project with one initial commit. Offline and deterministic.
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

git init -q -b main
git add -A
git -c user.name=eval -c user.email=eval@example.invalid commit -q -m "chore: initial project"
