import { area } from "./shape.mjs";

export const a13 = () => area.call(null, 13, 2) + area.apply(null, [3, 4]);
