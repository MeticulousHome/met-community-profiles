# Strict greater-than comparator migration

Numeric stage exit triggers now use the strict greater-than comparator (`>`). This applies to weight, time, pressure, flow, piston-position, and power triggers.

Published profiles in this repository were migrated from the legacy inclusive comparator (`>=`) to `>`. Decent profiles converted here also emit `>` for “over” conditions and generated time limits. “Under” and “less” conditions continue to emit `<=`.

This intentionally changes behavior only at the exact threshold. For example, a weight trigger set to `> 0 g` remains false while the measured weight is exactly 0 g and becomes true after the weight rises above 0 g. Existing trigger values, relative flags, stage data, limits, and the profile-level `final_weight` field are unchanged.

The migration is idempotent and is restricted to numeric entries in `stages[*].exit_triggers[*]`. Run `npm run migrate:comparators` to migrate the mirrored corpus and `npm run check:comparators` to verify that it is canonical.
