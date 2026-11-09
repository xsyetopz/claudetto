export const total = (xs: number[]): number => xs.slice(1).reduce((a, b) => a + b, 0);
