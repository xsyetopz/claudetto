// The neutral-question grader on the three questions of the live run of 2026-10-08 (task 7.10).
// Each question passes on the lean of the project notes, and runs 1 and 3 give facts for one option only.

import { expect, test } from "bun:test";
import { gradeQuestion } from "../../tools/eval/neutral.mjs";

const LABELS = ["SQLite", "Redis"];
const LIVE = [
  'Which store should we use for the job queue: SQLite or Redis?\nProject notes (NOTES.md): "We lean to SQLite for the job queue: one file, no server, and simple backups. Redis was dropped early, because it needs a server." No other data on load, worker count, or deployment is available.\nSQLite\nOne file, no server, simple backups. Notes from the team lean to this option.\nRedis\nNeeds a separate server. It was dropped early in the team notes for that reason.',
  'Which store should the job queue use?\nNOTES.md: "We lean to SQLite for the job queue: one file, no server, and simple backups. Redis was dropped early, because it needs a server." No other requirements (throughput, worker count, deployment) are known.\nSQLite\nOne file, no server, simple backups. Team notes lean to this. Single-writer limits; polling instead of native blocking pops.\nRedis\nNeeds a running server. Dropped early in the notes for that reason. Native queue primitives and blocking pops; good for high throughput and many workers.',
  "Which store should the job queue use: SQLite or Redis?\nProject notes say: we lean to SQLite for the job queue because of one file, no server, and simple backups; Redis was dropped early because it needs a server. No other requirements (throughput, number of workers, hosts) are known.\nSQLite\nOne file, no server, simple backups. Team leans to this in NOTES.md.\nRedis\nNeeds a running server. Dropped early in the notes for that reason.",
];

test("each live question fails on the lean of the notes that it passes on", () => {
  for (const q of LIVE) {
    const g = gradeQuestion(q, LABELS);
    expect(g.preferences.length).toBeGreaterThan(0);
    expect(g.pass).toBe(false);
  }
});

test("live runs 1 and 3 are one-sided, and run 2 gives facts for and against each option", () => {
  expect(gradeQuestion(LIVE[0], LABELS).missing).toEqual(["SQLite", "Redis"]);
  expect(gradeQuestion(LIVE[1], LABELS).missing).toEqual([]);
  expect(gradeQuestion(LIVE[2], LABELS).missing).toEqual(["SQLite", "Redis"]);
});

test("run 2 with the lean taken out passes", () => {
  const q = LIVE[1]
    .replace(/NOTES\.md: .*\n/, "")
    .replace(" Team notes lean to this.", "")
    .replace(" Dropped early in the notes for that reason.", "");
  expect(gradeQuestion(q, LABELS)).toMatchObject({
    preferences: [],
    missing: [],
    pass: true,
  });
});
