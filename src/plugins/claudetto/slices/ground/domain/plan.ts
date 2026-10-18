// The text of a call that `ground` checks: a write of a plan or a spec file, and the condition of a goal.

const PLAN_FILE =
  /(?:^|\/)openspec\/changes\/|(?:^|\/)(?:proposal|design|tasks)\.md$/;

/** The tool input that the check reads. The hook gives the fields of the input on the event. */
export interface PlanCall {
  tool: string;
  file_path?: string;
  content?: string;
  new_string?: string;
  condition?: string;
}

/** The new text of a `Write` or `Edit` of a plan file, or of a `ProposeGoal`, and `null` for any other call. */
export const planText = (call: PlanCall): string | null => {
  if (call.tool === "ProposeGoal") return call.condition ?? null;
  if (!PLAN_FILE.test(call.file_path ?? "")) return null;
  if (call.tool === "Write") return call.content ?? null;
  return call.tool === "Edit" ? (call.new_string ?? null) : null;
};
