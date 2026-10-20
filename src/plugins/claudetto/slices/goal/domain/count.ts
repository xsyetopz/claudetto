/** The count of steps with its noun: `1 step`, `2 steps`. */
export const stepsText = (count: number): string =>
  `${count} ${count === 1 ? "step" : "steps"}`;
