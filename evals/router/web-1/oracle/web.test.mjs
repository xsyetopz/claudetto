import assert from "node:assert";
import fs from "node:fs";
import { test } from "node:test";
import { urlName } from "../src/title.mjs";

test("hyphen", () =>
  assert.equal(urlName("Hello Big World"), "hello-big-world"));
test("accents keep the base letter", () =>
  assert.equal(urlName("Café Crème"), "cafe-creme"));
test("at most 20 characters, whole words", () => {
  assert.equal(urlName("Café Crème Brûlée Recipe Book"), "cafe-creme-brulee");
  assert.equal(urlName("aaaa bbbb cccc dddd eeee"), "aaaa-bbbb-cccc-dddd");
});
test("an ampersand is the word and", () => {
  assert.equal(urlName("Fish & Chips"), "fish-and-chips");
  assert.equal(urlName("Tom & Jerry & Co"), "tom-and-jerry-and-co");
  assert.equal(urlName("Fish & Chips & Fries & More"), "fish-and-chips-and");
});
test("a dot between digits stays, and any other dot goes", () => {
  assert.equal(urlName("Node 4.5 Guide"), "node-4.5-guide");
  assert.equal(urlName("Version 3.5.1 Notes"), "version-3.5.1-notes");
  assert.equal(urlName("Wait. What. Now"), "wait-what-now");
  assert.equal(urlName("Ends Here."), "ends-here");
});
test("other marks go", () =>
  assert.equal(urlName("Chef's Pick: Été!"), "chefs-pick-ete"));
test("letters with no accent mark that map to a base letter", () => {
  assert.equal(urlName("Łódź Straße"), "lodz-strasse");
  assert.equal(urlName("Ørsted Đồng"), "orsted-dong");
});
test("a hyphen or an underscore is a word break", () => {
  assert.equal(urlName("Pre-built snake_case"), "pre-built-snake-case");
  assert.equal(urlName("Node 4.5-beta"), "node-4.5-beta");
});
test("a title with no letter gives an empty name", () =>
  assert.equal(urlName("?! ..."), ""));
test("uses slugger", () =>
  assert.match(fs.readFileSync("src/title.mjs", "utf8"), /vendor\/slugger/));
