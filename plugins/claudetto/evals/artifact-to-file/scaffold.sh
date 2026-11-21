#!/usr/bin/env bash
# Scaffold: a small support-desk repo that holds no prompt file. Offline and deterministic.
set -euo pipefail

mkdir -p src
cat > README.md <<'MD'
# deskbot

A support-desk helper. `src/tickets.ts` holds the ticket store the helper reads.
MD
cat > src/tickets.ts <<'TS'
export interface Ticket {
	id: string;
	subject: string;
	status: "open" | "closed";
}

const store = new Map<string, Ticket>();

export function lookupTicket(id: string): Ticket | undefined {
	return store.get(id);
}

export function searchTickets(term: string): Ticket[] {
	return [...store.values()].filter((t) => t.subject.includes(term));
}
TS

git init -q -b main
git add -A
git -c user.name=eval -c user.email=eval@example.invalid commit -q -m "chore: initial deskbot"
