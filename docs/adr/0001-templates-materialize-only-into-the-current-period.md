# Templates materialize only into the current period

Flipping back to an earlier page shows exactly what was written on it, like paper: recurring goals are never backfilled onto past periods, and a template added today first appears on today's section. The alternative — deriving every period's lines from whichever templates were active at the time — would need template history and would make past pages change when templates change. `ensurePeriod` enforces this by returning its input unchanged for any period other than the one containing `today`.
