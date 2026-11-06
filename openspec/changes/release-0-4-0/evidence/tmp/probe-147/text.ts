import { GRADE_FAULTS } from "/Users/krystian/CodeProjects/xsyetopz/claudetto/plugins/claudetto/hooks/texts.ts";
const h1 = "The reply names a block, change, setting, value, or earlier event that appears only in the tool output listed below (the user sees none of it in full) and in no user message and no earlier assistant message, and the reply does not itself give that text or value with its file:line. A reply that quotes the text and gives its file:line, or names only what the user wrote or was shown, is not this fault.";
console.log("same unseen text:", GRADE_FAULTS.unseen.test === h1);
