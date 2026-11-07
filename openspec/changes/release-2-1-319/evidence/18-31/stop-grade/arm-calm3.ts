import { CREDIT_HEAD, gradeWith } from "./arm-new.ts";
// arm-calm with the tool-output heading reworded in place of the all-caps NOT.
export const VERIFY_GRADE = gradeWith(CREDIT_HEAD, " When unsure, answer {\"faults\":[]}.", (s) => s.replace("When unsure whether the request fixed the value, flag it. ", "").replace("Tool output of this turn, which the assistant read and the user did NOT see", "Tool output of this turn, hidden from the user (only the assistant read it)"));
