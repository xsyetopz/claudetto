// The database rules of the destructive floor.

import {
  DB_DELETE_FILES,
  DB_DROP,
  DB_FLUSH,
  DB_RESET,
  DB_TRUNCATE,
  DB_UNSCOPED_WRITE,
} from "../prompts.ts";
import { withAnyRoute } from "../route.ts";
import type { PolicyRule } from "../types.ts";

export const DATABASE_RULES: readonly PolicyRule[] = [
  {
    id: "db.drop",
    tier: "floor",
    category: "database",
    prose: withAnyRoute(DB_DROP),
  },
  {
    id: "db.truncate",
    tier: "floor",
    category: "database",
    prose: withAnyRoute(DB_TRUNCATE),
  },
  {
    id: "db.unscoped-write",
    tier: "floor",
    category: "database",
    prose: withAnyRoute(DB_UNSCOPED_WRITE),
  },
  {
    id: "db.reset",
    tier: "floor",
    category: "database",
    prose: withAnyRoute(DB_RESET),
  },
  {
    id: "db.flush",
    tier: "floor",
    category: "database",
    prose: withAnyRoute(DB_FLUSH),
  },
  {
    id: "db.delete-files",
    tier: "floor",
    category: "database",
    prose: withAnyRoute(DB_DELETE_FILES),
  },
];
