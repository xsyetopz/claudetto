// The text of a call that `ground` checks: a write of a plan or a spec file.

const PLAN_FILE =
  /(?:^|\/)openspec\/changes\/|(?:^|\/)(?:proposal|design|tasks)\.md$/;

/** The tool input that the check reads. The hook gives the fields of the input on the event. */
export interface PlanCall {
  tool: string;
  file_path?: string;
  content?: string;
  new_string?: string;
}

export const planText = (call: PlanCall): string | null => {
  if (!PLAN_FILE.test(call.file_path ?? "")) return null;
  if (call.tool === "Write") return call.content ?? null;
  return call.tool === "Edit" ? (call.new_string ?? null) : null;
};
