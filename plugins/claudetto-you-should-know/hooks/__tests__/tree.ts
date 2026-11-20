/** Readers for the element tree a mounted band draws. */

/** One element of a drawn tree, as far as the tests look into it. */
export interface Node {
	type?: string;
	props?: Record<string, unknown>;
	children?: unknown[];
	hover?: unknown;
}

export const isNode = (value: unknown): value is Node =>
	typeof value === "object" && value !== null;

/** The child of `node` at `index`, when it is an element and not text. */
export const childAt = (
	node: Node | undefined,
	index: number
): Node | undefined => {
	const child = node?.children?.[index];
	return isNode(child) ? child : undefined;
};

export const walk = (node: unknown, visit: (n: Node) => void): void => {
	if (!isNode(node)) {
		return;
	}
	visit(node);
	for (const child of node.children ?? []) {
		walk(child, visit);
	}
};

export const buttons = (tree: unknown): Record<string, unknown>[] => {
	const found: Record<string, unknown>[] = [];
	walk(tree, (n) => {
		if (n.type === "Button") {
			found.push(n.props ?? {});
		}
	});
	return found;
};

export const nodes = (tree: unknown, pred: (n: Node) => boolean): Node[] => {
	const found: Node[] = [];
	walk(tree, (n) => {
		if (pred(n)) {
			found.push(n);
		}
	});
	return found;
};
