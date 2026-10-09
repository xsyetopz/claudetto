import { area, perimeter } from "./shape.mjs";

const both = (f, w, h) => f(w, h);
export const a15 = () => both(area, 3, 5) + both(perimeter, 3, 5);
