// The SHA-256 of a text in hex, in plain code because the `crypto.subtle` of a mod runtime has `digest` only and is async.

const sqrtBits = (n: number): number =>
	Math.floor((Math.sqrt(n) % 1) * 2 ** 32);
const cbrtBits = (n: number): number =>
	Math.floor((Math.cbrt(n) % 1) * 2 ** 32);

const PRIMES = ((): number[] => {
	const found: number[] = [];
	for (let n = 2; found.length < 64; n++) {
		if (found.every((p) => n % p !== 0)) {
			found.push(n);
		}
	}
	return found;
})();
const K = PRIMES.map(cbrtBits);

const at = (list: ArrayLike<number>, i: number): number => list[i] ?? 0;

const rotr = (x: number, n: number): number => (x >>> n) | (x << (32 - n));

/** The SHA-256 of the UTF-8 bytes of `text`, in hex. */
export const sha256 = (text: string): string => {
	const data = new TextEncoder().encode(text);
	const padded = new Uint8Array(((data.length + 9 + 63) >> 6) << 6);
	padded.set(data);
	padded[data.length] = 0x80;
	const view = new DataView(padded.buffer);
	view.setUint32(padded.length - 8, Math.floor((data.length * 8) / 2 ** 32));
	view.setUint32(padded.length - 4, (data.length * 8) >>> 0);
	const h = PRIMES.slice(0, 8).map(sqrtBits);
	const w = new Uint32Array(64);
	for (let off = 0; off < padded.length; off += 64) {
		for (let i = 0; i < 16; i++) {
			w[i] = view.getUint32(off + i * 4);
		}
		for (let i = 16; i < 64; i++) {
			const a = at(w, i - 15);
			const b = at(w, i - 2);
			w[i] =
				(at(w, i - 16) +
					(rotr(a, 7) ^ rotr(a, 18) ^ (a >>> 3)) +
					at(w, i - 7) +
					(rotr(b, 17) ^ rotr(b, 19) ^ (b >>> 10))) >>>
				0;
		}
		let a = at(h, 0);
		let b = at(h, 1);
		let c = at(h, 2);
		let d = at(h, 3);
		let e = at(h, 4);
		let f = at(h, 5);
		let g = at(h, 6);
		let hh = at(h, 7);
		for (let i = 0; i < 64; i++) {
			const t1 =
				(hh +
					(rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) +
					((e & f) ^ (~e & g)) +
					at(K, i) +
					at(w, i)) >>>
				0;
			const t2 =
				((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) +
					((a & b) ^ (a & c) ^ (b & c))) >>>
				0;
			hh = g;
			g = f;
			f = e;
			e = (d + t1) >>> 0;
			d = c;
			c = b;
			b = a;
			a = (t1 + t2) >>> 0;
		}
		[a, b, c, d, e, f, g, hh].forEach((v, i) => {
			h[i] = (at(h, i) + v) >>> 0;
		});
	}
	return h.map((v) => v.toString(16).padStart(8, "0")).join("");
};
