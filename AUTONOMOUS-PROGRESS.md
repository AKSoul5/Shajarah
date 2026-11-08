# Autonomous progress record

Kept up to date while the owner is away. Decisions awaiting the owner:
[ON-HOLD.md](ON-HOLD.md). Nothing is merged into `main` and nothing is
published without the owner.

## Workstreams and branches

| Workstream | Branch (worktree) | HEAD |
|---|---|---|
| A. Stress test + spouse-frame page fix | `layout/fan-every-foundation` (`/home/user/wt-fan`) | `aa98dc0` |
| B. Typography and spacing | `layout/typography-spacing` (`/home/user/wt-typo`), branched from A at `600d9a0` | `404c9ab` |
| C. Quotation language | `feature/quote-language` (`/home/user/wt-quote`), from `main` | `eb789fe` |
| Notes | `notes/autonomous-progress` (`/home/user/wt-notes`), from `main` | this file |

Scratch outputs (not in git): `/tmp/claude-0/-home-user/e90cb42e-c033-5f48-94e9-9bb338f9cd65/scratchpad/`
(`stress/` matrix results and logs, `typo/` typography renders and
inspections, `quote/` quotation renders).

## Log

### 21:31 — resumed after a worker restart
- Stress matrix (A): restarted by `scratchpad/stress/run-all.sh`; resumable
  (saved results kept: 270 primary, 23 designs rows before the restart).
  Uses the corrected pairwise generator (`aa98dc0`, verified present in
  `wt-fan` before starting).
- B: committed the generator fix there too (`404c9ab`).
