import { expect, test } from "bun:test";

import { checkRelease } from "./release-version";

const upstream = ["v2.1.317", "v2.1.319", "v2.1.318", "v1.0.0"];

test("accepts 2.1.319 when no 2.1.319 tag exists", () => {
	expect(() => {
		checkRelease(["2.1.319", "2.1.319"], upstream, ["v0.3.0"]);
	}).not.toThrow();
});

test("refuses 2.1.318 when 2.1.319 is the latest", () => {
	expect(() => {
		checkRelease(["2.1.318"], upstream, []);
	}).toThrow("not the latest");
});

test("accepts 2.1.319+1 after the tag v2.1.319", () => {
	expect(() => {
		checkRelease(["2.1.319+1"], upstream, ["v2.1.319"]);
	}).not.toThrow();
});

test("refuses 2.1.319+2 after v2.1.319", () => {
	expect(() => {
		checkRelease(["2.1.319+2"], upstream, ["v2.1.319"]);
	}).toThrow("next release on 2.1.319 is 2.1.319+1");
});

test("refuses 2.1.319 again after the tag v2.1.319", () => {
	expect(() => {
		checkRelease(["2.1.319"], upstream, ["v2.1.319"]);
	}).toThrow("2.1.319+1");
});

test("refuses a version whose manifests disagree", () => {
	expect(() => {
		checkRelease(["2.1.319", "2.1.318"], upstream, []);
	}).toThrow("disagree");
});
