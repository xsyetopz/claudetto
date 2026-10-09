import { area } from "./shape.mjs";

const SIZES = [
  [2, 3],
  [4, 5],
];
export const a2 = () => SIZES.map(([w, h]) => area(w, h));
