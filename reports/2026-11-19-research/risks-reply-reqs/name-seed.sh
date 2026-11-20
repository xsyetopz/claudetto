# Seed: a head cut named for code points that cuts UTF-16 units, which its width callers rely on.
mkdir -p src
cat > src/text.ts <<'T'
export function sliceCodePointsHead(text: string, count: number): string {
	if (count <= 0) return "";
	if (text.length <= count) return text;
	return text.slice(0, count).replace(/[\uD800-\uDBFF]$/, "");
}

/** A card title cut to fit `width` terminal columns, with an ellipsis when cut. */
export function fitTitle(text: string, width: number): string {
	if (text.length <= width) return text;
	return `${sliceCodePointsHead(text, width - 1).trimEnd()}…`;
}

/** A sketch line cut to `width` terminal columns. */
export const fitSketch = (line: string, width: number): string => sliceCodePointsHead(line, width);

export const slug = (text: string): string =>
	text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
T
cat > src/text.test.ts <<'T'
import { expect, test } from "bun:test";
import { fitTitle, slug } from "./text";

test("short titles are kept", () => {
	expect(fitTitle("Hello", 10)).toBe("Hello");
});

test("slug joins words", () => {
	expect(slug("Hello World")).toBe("hello-world");
});
T
printf '{"name":"cards","scripts":{"test":"bun test"}}\n' > package.json
