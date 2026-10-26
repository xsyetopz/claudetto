// Shared fixtures of `build*.test.ts`: the bundle fixture and the readers of the shipped schemas.

import path from "node:path";
import { schemaFiles } from "../../../../dev/schema/domain/build.ts";
import type { Schema } from "../../../../dev/schema/domain/types.ts";
import { REPO } from "../../../support/repo.ts";

export const VERSION = "2.1.302";
export const shipped = async (kind: "user" | "managed") =>
  JSON.parse(
    await Bun.file(path.join(REPO, "schemas", schemaFiles()[kind])).text(),
  ) as Schema;

export type Props = Record<string, Schema>;

// The `properties` of a schema node. A node without `properties` gives `undefined` at run time, as a plain read does.
export const props = (node: Schema | undefined) => node?.properties as Props;

// The node at a path of property names, so `at(s, "a", "b")` reads `s.properties.a.properties.b`.
export const at = (node: Schema | undefined, ...keys: string[]): Schema => {
  let found = node;
  for (const key of keys) found = props(found)[key];
  return found as Schema;
};

// A module of type helpers in the shape of the bundle, and the start of the module of the schema, which imports them.
// The build reads the meaning of each helper from its `type:"..."` tag, in its body or in the body of its factory.
export const HELPERS = [
  "// @bun\n",
  'function zn(e,t){return new e({type:"string",...t})}',
  "function o(e){return zn(S,e)}",
  'function H(e){return new K({type:"boolean"})}',
  'function E(e){return new N({type:"number",checks:[]})}',
  'function u(e,t){let r={type:"object",shape:e};return new O(r)}',
  'function C(e,t){return new R({type:"array",element:e})}',
  'function B(e,t){return new U({type:"enum",entries:e})}',
  'function A(e,t){return new L({type:"literal",values:[e]})}',
  'function fe(e,t){return new D({type:"record",keyType:e,valueType:t})}',
  'function $e(e,t){return new Y({type:"union",options:e})}',
  "export{o,H,E,u,C,B,A,fe,$e};\n",
  "// @bun\n",
  'import{o,H,E,u,C,B,A,fe,$e}from"/$bunfs/root/chunk-z.js";',
  'function Pe(e){return new W({type:"lazy",getter:e})}',
].join("");

export const FIXTURE = [
  HELPERS,
  'var x=/}"{/.test(a);',
  'function ya(e){return u({allow:C(o()).optional().describe("Allowed rules"),mode:B(["a","b"]).optional()}).passthrough()}',
  'var Z=f(()=>u({enabled:H().optional().describe("Run in the sandbox"),',
  'level:E().int().min(1).optional().describe("Level")}));',
  'const s={$schema:()=>o().optional().describe("Schema `ref` {x}"),',
  'model:()=>o().optional().describe("A \\u2014 "+Q+"b"),',
  'permissions:()=>Pe(()=>ya(e)).describe("Permissions"),',
  "sandbox:()=>Pe(()=>Z()),",
  'polOnly:()=>H().optional().describe("Only honored from managed settings."),',
  `pat:()=>o().optional().describe("t \${a} }"),re:()=>o().optional().describe("r"),`,
  '...!1,...flag&&{gated:()=>H().optional().describe("Gated key")},',
  "...Qr(Xi(e),(i)=>()=>i)};",
].join("");
