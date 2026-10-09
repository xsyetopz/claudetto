import * as shape from "./shape.mjs";

const { area: calc } = shape;
const ops = { area: shape.area };
export const a18 = () => calc(18, 2) + ops.area(3, 3);
