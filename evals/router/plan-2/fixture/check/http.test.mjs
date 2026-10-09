import assert from "node:assert";
import { test } from "node:test";
import { get } from "../src/http.mjs";

test("get is a function", () => assert.equal(typeof get, "function"));
