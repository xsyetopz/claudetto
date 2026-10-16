// The `Read` deny rules for `.env` files of the `prompt` slice: each env file that holds secrets is denied.
// The example, sample, and template files stay readable, because no deny rule names them.

import { expect, test } from "bun:test";
import { slice } from "../../../plugins/claudetto/slices/prompt/slice.ts";

const ENV_RULES = [
  "Read(**/.env)",
  "Read(**/.env.local)",
  "Read(**/.env.production)",
  "Read(**/.env.*.local)",
  "Read(**/.env.development)",
  "Read(**/.env.dev)",
  "Read(**/.env.staging)",
  "Read(**/.env.stage)",
  "Read(**/.env.test)",
  "Read(**/.env.prod)",
  "Read(**/.env.qa)",
  "Read(**/.env.preview)",
];

const READABLE = [".env.example", ".env.sample", ".env.template"];

const deny = slice.settings.permissions.deny;

test("the `prompt` deny rules list each `.env` file that holds secrets", () => {
  const envRules = deny.filter((rule) => rule.startsWith("Read(**/.env"));
  expect(envRules).toStrictEqual(ENV_RULES);
});

test("no `prompt` deny rule names an example, sample, or template `.env` file", () => {
  for (const name of READABLE)
    expect(deny.filter((rule) => rule.includes(name))).toStrictEqual([]);
});
