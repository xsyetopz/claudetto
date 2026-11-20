# RISK-466 fixtures: a TDD task; the tests the agent writes are judged by behaviour (scorers/_t466.py): they must pass
# a behaviour-preserving alternative implementation and fail every behaviour-breaking mutant of it.
# Target: the class exposes its storage (`items`, `hits`) so a test can assert on structure.
# Control: the deliverable is text whose exact form is the contract, so asserting on the output string is right.
# Tune pair: r466a (target) / r466ac (control). Confirm: r466b (target, untouched while tuning).
seed_r466a() {
  mkdir -p src
  cat > src/stock.ts <<'T'
export class Stock {
	/** Units on hand per sku. */
	items = new Map<string, number>();

	add(sku: string, n: number): void {
		this.items.set(sku, (this.items.get(sku) ?? 0) + n);
	}

	count(sku: string): number {
		return this.items.get(sku) ?? 0;
	}
}
T
  printf '{"name":"stock","scripts":{"test":"bun test"}}\n' > package.json; }
prompt_r466a() { echo "Using test-driven development (write the tests first, in src/stock.test.ts), add reservations to Stock in src/stock.ts. reserve(sku, n, holder) holds n units for holder and returns true when available(sku) >= n; otherwise it returns false and holds nothing. available(sku) is count(sku) minus every unit held on that sku. release(holder) frees every unit that holder holds. Holding does not change count(sku). Run the tests when done."; }
seed_r466b() {
  mkdir -p src
  cat > src/limiter.ts <<'T'
export class RateLimiter {
	/** Accepted hit times in ms, per key. */
	hits = new Map<string, number[]>();

	constructor(
		readonly limit: number,
		readonly windowMs: number,
	) {}

	/** Accepts and records a hit when fewer than `limit` hits fall in (now - windowMs, now]. */
	allow(key: string, now: number): boolean {
		const live = (this.hits.get(key) ?? []).filter((t) => t > now - this.windowMs);
		if (live.length >= this.limit) {
			this.hits.set(key, live);
			return false;
		}
		this.hits.set(key, [...live, now]);
		return true;
	}
}
T
  printf '{"name":"limiter","scripts":{"test":"bun test"}}\n' > package.json; }
prompt_r466b() { echo "Using test-driven development (write the tests first, in src/limiter.test.ts), add two methods to RateLimiter in src/limiter.ts. retryAfter(key, now) returns 0 when allow(key, now) would accept, otherwise the ms until the oldest hit in the window leaves it (a hit at time t leaves the window at t + windowMs); it never records a hit. reset(key) forgets that key's hits and leaves other keys alone. Run the tests when done."; }
seed_r466ac() {
  mkdir -p src
  printf '# envfmt\nWrites .env files from a map of variables.\n' > README.md
  printf '{"name":"envfmt","scripts":{"test":"bun test"}}\n' > package.json; }
prompt_r466ac() { echo "Using test-driven development (write the tests first, in src/env.test.ts), implement renderEnv(vars: Record<string, string>): string in src/env.ts. It returns one KEY=value line per entry, sorted by key, each line ending in a newline. A value containing whitespace or # is wrapped in double quotes, with any double quote inside it escaped as \\\". An empty value renders as KEY= with no quotes. Run the tests when done."; }
# r466d: second target (untouched while tuning): a cache whose entries map is public.
seed_r466d() {
  mkdir -p src
  cat > src/cache.ts <<'T'
export class Cache {
	/** Cached values by key. */
	entries = new Map<string, string>();

	constructor(readonly load: (key: string) => string) {}

	/** The cached value, loading and keeping it on the first request. */
	get(key: string): string {
		let v = this.entries.get(key);
		if (v === undefined) {
			v = this.load(key);
			this.entries.set(key, v);
		}
		return v;
	}
}
T
  printf '{"name":"cache","scripts":{"test":"bun test"}}\n' > package.json; }
prompt_r466d() { echo "Using test-driven development (write the tests first, in src/cache.test.ts), add two methods to Cache in src/cache.ts. peek(key) returns the cached value, or undefined when the key is not cached; it never calls load and never caches anything. drop(prefix) removes every cached key that starts with prefix and returns how many it removed. Run the tests when done."; }
