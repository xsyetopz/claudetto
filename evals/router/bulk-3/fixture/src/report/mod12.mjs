import { area } from "../shape.mjs";

const rows = [
  { w: 1, h: 2 },
  { w: 3, h: 4 },
];
export const a12 = () => Array.from(rows, (r) => area(r.w, r.h));
export const total12 = () => rows.reduce((sum, r) => sum + area(r.w, r.h), 0);
