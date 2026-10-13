// The cloud and cluster rules of the destructive floor.

import { withAnyRoute } from "../route.ts";
import type { PolicyRule } from "../types.ts";

export const CLOUD_RULES: readonly PolicyRule[] = [
  {
    id: "cloud.destroy",
    tier: "floor",
    category: "cloud",
    prose: withAnyRoute(
      "A delete of cloud or cluster resources or storage, such as `terraform destroy`, `kubectl delete namespace`, or a forced delete of a bucket.",
    ),
  },
];
