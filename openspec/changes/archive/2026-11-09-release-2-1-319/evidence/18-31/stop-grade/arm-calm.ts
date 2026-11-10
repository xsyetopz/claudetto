import { CREDIT_HEAD, gradeWith } from "./arm-new.ts";
// arm-unsure without the all-caps NOT and without the "when unsure, flag it" line in the asks fault.
export const VERIFY_GRADE = gradeWith(
	CREDIT_HEAD,
	' When unsure, answer {"faults":[]}.',
	(s) =>
		s
			.replace("When unsure whether the request fixed the value, flag it. ", "")
			.replace("did NOT see", "did not see"),
);
