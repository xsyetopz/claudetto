// The cloud and cluster rules of the destructive floor.

import { CLOUD_DESTROY } from "../prompts.ts";
import { withAnyRoute } from "../route.ts";
import type { PolicyRule } from "../types.ts";

export const CLOUD_RULES: readonly PolicyRule[] = [
  {
    id: "cloud.destroy",
    tier: "floor",
    category: "cloud",
    prose: withAnyRoute(CLOUD_DESTROY),
  },
];
