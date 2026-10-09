export const area = (w, h) => w * h;
export const perimeter = (w, h) => 2 * (w + h);
export const areaOf = (shape) => area(shape.w, shape.h);
// The old name of `area`, kept for the callers of the report code.
export { area as rectArea };
