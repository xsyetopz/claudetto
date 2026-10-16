// The handback line of a run: the first line of the tool result that is not the line of the agent id.
// The id comes from the structured field `toolUseResult.agentId`, so no word of a language is matched.

import { expect, test } from "bun:test";
import { firstLine } from "../../../plugins/claudetto-sessions/slices/usage/domain/parse.ts";

const ID = "a6ed515eadca7959d";

test("the line that holds the agent id is skipped, in any language", () => {
  const tag = `kod agenta: ${ID} (użyj SendMessage)`;
  expect(firstLine(`${tag}\nRaport gotowy.`, ID)).toBe("Raport gotowy.");
  expect(firstLine(`エージェント ${ID}\n報告は完了しました。`, ID)).toBe(
    "報告は完了しました。",
  );
});

test("a line that starts like an id line but holds another id is kept", () => {
  expect(firstLine(`agentId: other\nReport.`, ID)).toBe("agentId: other");
});

test("with no id, the first line that is not blank is the handback", () => {
  expect(firstLine("\n  \nDone.\nMore.")).toBe("Done.");
});
