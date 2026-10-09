/** The cents of a price text such as `19.99`. */
export function toCents(price) {
  return (parseFloat(price) * 100) | 0;
}

export function fromCents(cents) {
  return (cents / 100).toFixed(2);
}
