// The colors of the status line: the built-in theme from the `theme` key, and the cases `*-ansi`, `*-daltonized`, and `NO_COLOR`.

import { expect, test } from "bun:test";
import { readThemeName } from "../../../src/plugins/claudetto/slices/statusline/adapters/theme.ts";
import { paintOf } from "../../../src/plugins/claudetto/slices/statusline/color.ts";
import { themeOf } from "../../../src/plugins/claudetto/slices/statusline/theme.ts";
import { noFiles, rowsOf } from "./support.ts";

const ESC = String.fromCharCode(27);
const sgr = (parameters: string): string => `${ESC}[${parameters}m`;

/** The files of a run with a config file of Claude Code that holds `config`. */
const configWith = (config: string) => ({
  read: async (file: string) =>
    file === "/home/user/.claude.json" ? config : null,
  list: async () => [],
});

const roles = (name: string) => {
  const paint = paintOf(themeOf(name));
  return {
    ok: paint.ok("x"),
    warn: paint.warn("x"),
    limit: paint.limit("x"),
    inactive: paint.inactive("x"),
    branch: paint.branch("x"),
    model: paint.model("x"),
  };
};

const paintFor = (parameters: string) => `${sgr(parameters)}x${sgr("0")}`;

test("the `dark` theme gives the colors of its map", () => {
  expect(roles("dark")).toStrictEqual({
    ok: paintFor("38;2;78;186;101"),
    warn: paintFor("38;2;255;193;7"),
    limit: paintFor("38;2;255;107;128"),
    inactive: paintFor("38;2;153;153;153"),
    branch: paintFor("38;2;175;135;255"),
    model: paintFor("38;2;215;119;87"),
  });
});

test("the `light` theme gives the colors of its map", () => {
  expect(roles("light")).toStrictEqual({
    ok: paintFor("38;2;44;122;57"),
    warn: paintFor("38;2;150;108;30"),
    limit: paintFor("38;2;171;43;63"),
    inactive: paintFor("38;2;102;102;102"),
    branch: paintFor("38;2;135;0;255"),
    model: paintFor("38;2;215;119;87"),
  });
});

test("the `dark-ansi` theme uses the 16 ANSI colors, with ANSI 35 for the branch", () => {
  expect(roles("dark-ansi")).toStrictEqual({
    ok: paintFor("32"),
    warn: paintFor("33"),
    limit: paintFor("31"),
    inactive: paintFor("90"),
    branch: paintFor("35"),
    model: paintFor("91"),
  });
  expect(roles("light-ansi")).toStrictEqual(roles("dark-ansi"));
});

test("the `dark-daltonized` theme gives its own values", () => {
  expect(roles("dark-daltonized")).toStrictEqual({
    ok: paintFor("38;2;51;153;255"),
    warn: paintFor("38;2;255;204;0"),
    limit: paintFor("38;2;255;102;102"),
    inactive: paintFor("38;2;153;153;153"),
    branch: paintFor("38;2;175;135;255"),
    model: paintFor("38;2;255;153;51"),
  });
});

test("a theme that is not built in, such as `auto`, has the colors of `dark`", () => {
  expect(roles("auto")).toStrictEqual(roles("dark"));
  expect(roles("custom:mine")).toStrictEqual(roles("dark"));
});

test("with no theme the styles add nothing", () => {
  const paint = paintOf(null);
  expect(paint.ok("x")).toBe("x");
  expect(paint.branch("x")).toBe("x");
  expect(paint.review("approved")("x")).toBe("x");
});

test("the CLI reads the `theme` key of the config file", async () => {
  const { text } = await rowsOf(
    {},
    {
      env: { COLUMNS: "160" },
      files: configWith('{"theme":"light"}'),
    },
  );
  expect(text).toContain(`${sgr("38;2;135;0;255")}⎇ main`);
});

test("`CLAUDE_CONFIG_DIR` moves the config file", async () => {
  const files = {
    read: async (file: string) =>
      file === "/cfg/.claude.json" ? '{"theme":"dark-ansi"}' : null,
    list: async () => [],
  };
  const { text } = await rowsOf(
    {},
    { env: { COLUMNS: "160", CLAUDE_CONFIG_DIR: "/cfg" }, files },
  );
  expect(text).toContain(`${sgr("35")}⎇ main`);
});

test("`NO_COLOR` gives no color, whatever the theme", async () => {
  const { text } = await rowsOf(
    {},
    {
      env: { COLUMNS: "160", NO_COLOR: "1" },
      files: configWith('{"theme":"light"}'),
    },
  );
  expect(text).not.toContain(ESC);
});

test("a config file that cannot be parsed writes the cause to stderr and keeps the `dark` theme", async () => {
  const { text, run } = await rowsOf(
    {},
    { env: { COLUMNS: "160" }, files: configWith("{") },
  );
  expect(run.err.join("")).toContain("JSON");
  expect(text).toContain(`${sgr("38;2;175;135;255")}⎇ main`);
});

test("a missing config file gives no theme name and no error", async () => {
  const errors: string[] = [];
  expect(
    await readThemeName("/none", noFiles, (e) => errors.push(e)),
  ).toBeNull();
  expect(errors).toStrictEqual([]);
});
