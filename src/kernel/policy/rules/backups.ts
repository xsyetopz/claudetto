// The backup rules of the destructive floor.

import { BACKUPS_DELETE } from "../prompts.ts";
import { withAnyRoute } from "../route.ts";
import type { PolicyRule } from "../types.ts";

export const BACKUP_RULES: readonly PolicyRule[] = [
  {
    id: "backups.delete",
    tier: "floor",
    category: "backups",
    prose: withAnyRoute(BACKUPS_DELETE),
  },
];
