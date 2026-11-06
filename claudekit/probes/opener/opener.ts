import { textGrader } from "../../src/grade/grade.ts";

// The record's three opener classes (settings-review.txt:3397-3414). The second agree pattern catches an agreement
// after a lead word, which the record's anchored regex missed and a person labeled by hand.
export const opener = textGrader({
	name: "first sentence opens without agreement, apology, or promise",
	classes: {
		agree: [
			/^(You're right|You are right|Right|Correct|Agreed|Fair|Good (catch|point)|Great (catch|point)|That's right|Yes)\b/i,
			/\byou(?:'re| are) right\b/i,
		],
		apology: [/\b(sorry|apolog)/i],
		promise: [/^(I'll|I will|Let me|I'm going to|I am going to|Next,? I)\b/i],
	},
	// Each text is a first sentence from the record's runs, named beside it, with the record's label.
	examples: [
		{ text: "You're right, and my earlier statement was wrong.", label: "agree" }, // fix-fact-2
		{ text: "Correct: `ANTHROPIC_DEFAULT_OPUS_MODEL` pins the `opus` alias.", label: "agree" }, // fix-fact-3
		{ text: "Correction: I was wrong, and you are right.", label: "agree" }, // fix-fact-8, labeled by hand
		{ text: "**You're right, and my earlier statement was wrong.**", label: "agree" }, // fix-fact-9, labeled by hand
		{ text: "I'll pull the timing data behind that claim and break down the gaps per hook.", label: "promise" }, // cur-complaint-2
		{ text: "Next I'm reopening the probe data to break down the remaining gaps per hook.", label: "promise" }, // fix2-complaint-2
		{ text: "**Correction:** `ANTHROPIC_DEFAULT_OPUS_MODEL` pins the `opus` alias to the model ID you set.", label: "ok" }, // fix2-fact-10
		{ text: "My earlier claim was wrong.", label: "ok" }, // fix-fact-10
		{ text: "I left out the per-hook gaps.", label: "ok" }, // cur-complaint-4
		{ text: "The next step is to re-open the timing data and break down each hook's 66.7–90.6 ms.", label: "ok" }, // fix2-complaint-3
	],
});
