import { join } from "node:path";
import { type Arm, materializeArm } from "../arm/arm.ts";
import type { Message } from "../fixture/fixture.ts";
import { startFake } from "../fake/fake.ts";
import type { Plan } from "../fake/plan.ts";
import type { SessionResult } from "./ab.ts";
import { launch, type LaunchResult, type LaunchSpec } from "../launcher/launcher.ts";
import { createRun, readRecord, type Run } from "../workspace/workspace.ts";

export interface ArmLaunch {
	probe: string;
	root?: string;
	plan: Plan;
	// Forward each request to this URL, as F20's login runs do.
	forward?: string;
	launch: Pick<LaunchSpec, "mode" | "settingSources" | "auth" | "persist" | "passEnv">;
	// Runs after the run folder and arm exist and before the launch, e.g. to write rules under the run's config folder.
	prepare?: (run: Run) => Promise<void>;
}

export interface ArmRun {
	run: Run;
	result: LaunchResult;
	// The fake's saved requests, read with `readRequests`.
	requests: string;
}

// A capped run has no result event, so its usage and capped flag come from the run record.
export const cappedRun = async (run: Run): Promise<Pick<SessionResult, "capped" | "usage"> | undefined> => {
	const { capped, usage } = await readRecord(run.dir);
	return capped && usage ? { capped, usage } : undefined;
};

// One session of an arm against its own fake, which stops even when the launch throws.
export const launchArm = async (arm: Arm, c: { name: string; prompt: string; prefix?: Message[] }, opts: ArmLaunch): Promise<ArmRun> => {
	const run = await createRun({ probe: opts.probe, ...(opts.root ? { root: opts.root, quiet: true } : {}) });
	const requests = join(run.dir, "requests");
	const { pluginDirs, treeHashes } = await materializeArm(arm, run);
	await opts.prepare?.(run);
	const fake = await startFake({ plan: opts.plan, dir: requests, ...(opts.forward ? { forward: opts.forward } : {}) });
	try {
		const spec: LaunchSpec = {
			...opts.launch,
			prompt: c.prompt,
			...(c.prefix ? { prefix: c.prefix } : {}),
			model: arm.model,
			baseUrl: fake.url,
			pluginDirs,
			pluginTreeHashes: treeHashes,
			settings: arm.settings ?? {},
			env: arm.env ?? {},
			flags: arm.flags ?? [],
			arm: arm.name,
			case: c.name,
		};
		return { run, result: await launch(spec, run), requests };
	} finally {
		await fake.stop();
	}
};

// Each arm's measures from the sessions whose arm check passed, so a rejected session shows in no table.
export const measuresByArm = <M>(
	results: { arm: string; runId: string; armCheck: { ok: boolean } }[],
	measures: Map<string, M>,
): Record<string, M[]> => {
	const byArm: Record<string, M[]> = {};
	for (const r of results) {
		const m = measures.get(r.runId);
		if (m !== undefined && r.armCheck.ok) {
			(byArm[r.arm] ??= []).push(m);
		}
	}
	return byArm;
};
