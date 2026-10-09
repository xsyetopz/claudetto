export class LruBox {
  constructor({ max }) {
    this.max = max;
    this.m = new Map();
  }
  put(k, v) {
    this.m.delete(k);
    this.m.set(k, v);
    if (this.m.size > this.max) this.m.delete(this.m.keys().next().value);
  }
  fetch(k) {
    if (!this.m.has(k)) return undefined;
    const v = this.m.get(k);
    this.m.delete(k);
    this.m.set(k, v);
    return v;
  }
}
