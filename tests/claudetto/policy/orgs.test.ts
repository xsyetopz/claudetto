// The reading of the organizations that the user owns (`domain/orgs.ts`).

import { expect, test } from "bun:test";
import { ownedOrgsOf } from "../../../src/plugins/claudetto/slices/policy/domain/orgs.ts";

const row = (login: string, role: string, state = "active") => ({
  state,
  role,
  organization: { login },
});

test("`ownedOrgsOf` keeps each active `admin` membership of each page, in lower case", () => {
  const pages = [
    [row("Acme", "admin"), row("Club", "member")],
    [row("Bank", "billing_manager"), row("Next", "admin", "pending")],
    [row("Own", "admin")],
  ];
  expect(ownedOrgsOf(JSON.stringify(pages))).toEqual(["acme", "own"]);
});

test("`ownedOrgsOf` gives `undefined` for output that is not the JSON list of the endpoint", () => {
  expect(ownedOrgsOf("HTTP 401")).toBeUndefined();
  expect(ownedOrgsOf('{"message":"Bad credentials"}')).toBeUndefined();
  expect(ownedOrgsOf("[[]]")).toEqual([]);
  expect(ownedOrgsOf("[[null, {}]]")).toEqual([]);
});
