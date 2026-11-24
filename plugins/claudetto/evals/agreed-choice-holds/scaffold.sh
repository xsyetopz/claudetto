#!/usr/bin/env bash
# Scaffold: a tiny notes library whose store is in memory. The replayed history chose how to
# persist it; the choice lives only in that history. Offline and deterministic.
set -euo pipefail

mkdir -p src
cat > package.json <<'JSON'
{
  "name": "tiny-notes",
  "private": true,
  "type": "module",
  "scripts": { "test": "bun test" }
}
JSON
cat > src/notes.ts <<'TS'
export interface Note {
	id: number;
	text: string;
}

const notes: Note[] = [];

export function addNote(text: string): Note {
	const note = { id: notes.length + 1, text };
	notes.push(note);
	return note;
}

export function listNotes(): Note[] {
	return [...notes];
}
TS
cat > src/notes.test.ts <<'TS'
import { expect, test } from "bun:test";
import { addNote, listNotes } from "./notes";

test("an added note is listed", () => {
	addNote("buy milk");
	expect(listNotes().map((n) => n.text)).toContain("buy milk");
});
TS
cat > README.md <<'MD'
# tiny-notes

A tiny notes library. Notes live in memory today.
MD
