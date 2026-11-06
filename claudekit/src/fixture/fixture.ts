import { join } from "node:path";
import { isRecord } from "../shared/record.ts";

const WORKER = join(import.meta.dir, "held-out-worker.ts");
const SOURCE = /^(written|\S+:\d+)$/;
const ROLES = ["user", "assistant"];

export interface Message {
	role: "user" | "assistant";
	content: string;
}

export interface Fixture {
	id: string;
	prefix: Message[];
	reply: string;
	userReply: string;
	labels: Record<string, string>;
	// A session `path:line`, or "written".
	source: string;
}

export interface FixtureSet {
	name: string;
	heldOut: boolean;
	fixtures: Fixture[];
}

export interface Aggregate {
	n: number;
	pass: number;
	byLabel: Record<string, number>;
}

export const parseSet = (data: unknown): FixtureSet => {
	if (!isRecord(data) || typeof data.name !== "string" || !Array.isArray(data.fixtures)) {
		throw new Error("fixture set: needs name (string) and fixtures (array)");
	}
	const errors = data.fixtures.flatMap((f, i) => fixtureErrors(f).map((e) => `fixture ${i}: ${e}`));
	const ids = data.fixtures.map((f) => (isRecord(f) ? f.id : undefined));
	const repeated = ids.filter((id, i) => ids.indexOf(id) !== i);
	if (repeated.length > 0) {
		errors.push(`repeated ids: ${JSON.stringify(repeated)}`);
	}
	if (errors.length > 0) {
		throw new Error(`fixture set ${data.name}:\n  ${errors.join("\n  ")}`);
	}
	return { name: data.name, heldOut: data.heldOut === true, fixtures: data.fixtures as Fixture[] };
};

export const loadFixtures = async (path: string): Promise<FixtureSet> => parseSet(await Bun.file(path).json());

// The worker's output is ignored and only its IPC message is read, so no case text reaches this process.
export const gradeHeldOut = async (setPath: string, graderModule: string): Promise<Aggregate> => {
	let answer: unknown;
	const child = Bun.spawn(["bun", WORKER, setPath, graderModule], {
		stdin: "ignore",
		stdout: "ignore",
		stderr: "ignore",
		ipc: (m) => {
			answer = m;
		},
	});
	const code = await child.exited;
	if (!isRecord(answer) || typeof answer.n !== "number") {
		throw new Error(`held-out grading: worker exit ${code}, no aggregate`);
	}
	if (typeof answer.error === "string") {
		throw new Error(`held-out grading: ${answer.error}`);
	}
	return answer as unknown as Aggregate;
};

const fixtureErrors = (f: unknown): string[] => {
	if (!isRecord(f)) {
		return ["not an object"];
	}
	const errors: string[] = [];
	for (const key of ["id", "reply", "userReply", "source"]) {
		if (typeof f[key] !== "string" || f[key] === "") {
			errors.push(`${key}: want a non-empty string`);
		}
	}
	if (typeof f.source === "string" && !SOURCE.test(f.source)) {
		errors.push(`source ${JSON.stringify(f.source)}: want path:line or "written"`);
	}
	const prefixOk =
		Array.isArray(f.prefix) &&
		f.prefix.every((m) => isRecord(m) && ROLES.includes(m.role as string) && typeof m.content === "string");
	if (!prefixOk) {
		errors.push("prefix: want an array of { role: user|assistant, content: string }");
	}
	if (!isRecord(f.labels) || !Object.values(f.labels).every((v) => typeof v === "string")) {
		errors.push("labels: want an object of strings");
	}
	return errors;
};
