// The backup rules of the destructive floor.

import { withAnyRoute } from "../route.ts";
import type { PolicyRule } from "../types.ts";

export const BACKUP_RULES: readonly PolicyRule[] = [
  {
    id: "backups.delete",
    tier: "floor",
    category: "backups",
    prose: withAnyRoute(
      "A delete of a backup, a snapshot, or an archive of data, in any store.",
    ),
  },
];
