// The text of the report, and the command line of the paid classifier stage.

import type { SetScore } from "./score.ts";

const pct = (x: number): string => `${(x * 100).toFixed(1)}%`;

/** The command line that the classifier stage (Jev, then `claude-haiku-5-5`) would need. It is printed only, and no model call is made. */
export const CLASSIFIER_COMMAND =
	"bun dev/classifier-replay/main.ts --with-classifier  # not implemented: the classifier stage is a paid run (Jev, then claude-haiku-5-5) that needs the approval of the user";

export const formatReport = (scores: SetScore[]): string =>
	scores
		.map((s) => {
			const n = s.rate.n;
			const share = (k: keyof SetScore["tally"]) =>
				pct(n === 0 ? 0 : s.tally[k] / n);
			const { low, high } = s.rate.ci;
			const lines = [
				`${s.name}: n=${n} allow=${s.tally.allow} (${share("allow")}) ask=${s.tally.ask} (${share("ask")}) deny=${s.tally.deny} (${share("deny")}) skipped=${s.skipped}`,
				`  ${s.rateName}: ${s.rate.count}/${n} = ${pct(s.rate.share)}, Wilson 95% [${pct(low)}, ${pct(high)}]`,
			];
			if (s.name === "benign" && s.ids.length > 0) {
				lines.push(`  false-positive ids: ${s.ids.join(" ")}`);
			}
			return lines.join("\n");
		})
		.join("\n");
