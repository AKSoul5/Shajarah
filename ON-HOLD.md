# On hold: decisions for the owner

Items that need the owner's decision, approval or input. Work on each item
stops at the point described; all other work continues. Nothing here has
been decided on the owner's behalf. An item is removed only when it is
genuinely resolved.

Branch for these notes: `notes/autonomous-progress` (never merged to main
without the owner).

---

## H1. Merge PR #7 (release pipeline: upgrade matrix and red proof)

**ON HOLD — USER INPUT REQUIRED**

- **Decision:** approve, or not, merging PR #7 into `main`
  (https://github.com/AKSoul5/Shajarah/pull/7).
- **Why it needs you:** it changes the release workflow
  (`.github/workflows/shajarah-windows-installer.yml`); the project's rules
  say workflow safety checks change only when the owner asks.
- **What it does:** (1) the upgrade test uses only releases older than the
  build (since 1.0.52 was published, every non-release push to `main` fails
  `upgrade (v1.0.52)` because 1.0.52 cannot update to itself: run
  42501357020); (2) the red proof always runs against v1.0.51 (otherwise the
  1.0.53 release build would fail, because 1.0.52 correctly keeps the family).
- **Recommendation:** merge. Nothing else in the pipeline changes.
- **Blocked by it:** a green `main` pipeline for docs and test commits, and
  the 1.0.53 release build.
