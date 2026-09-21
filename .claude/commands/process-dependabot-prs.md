---
name: "Process Dependabot PRs"
description: Triage and squash-merge every open Dependabot PR whose checks and SonarQube quality gate pass, waiting for Dependabot to rebase PRs that conflict with each other, and escalating real failures instead of guessing
category: Workflow
tags: [git, github, dependabot, workflow, sonarqube]
---

Process every open Dependabot pull request in this repo: merge the ones that are safe, wait out the ones blocked on a rebase, and stop to ask the user about anything that isn't a clean pass (a real CI failure, a merge conflict that isn't just "needs a Dependabot rebase", or a major-version bump that needs actual code changes).

**Input**: None required. Optionally the user may pass a PR number to start from, or "skip #NN" to exclude one. Default: process every open Dependabot PR, lowest number first.

## Background — read before running

This procedure was worked out live in a session that merged PRs #77–#84 in this repo. The two gotchas below cost real time; do not relearn them.

1. **Merging one Dependabot PR routinely conflicts the others.** Any PR that touches `package.json`/`pnpm-lock.yaml` will flip to `DIRTY`/`CONFLICTING` as soon as an earlier merge changes the lockfile. This is expected, not an error — Dependabot watches pushes to the base branch and rebases automatically, usually within 1–3 minutes. Poll for it (see Step 3); don't hand-resolve the conflict yourself.

2. **Never push a manual commit onto a Dependabot branch expecting `@dependabot rebase` to preserve it.** Dependabot refuses to rebase a PR it detects has been edited by someone else — it posts a comment explaining this and suggests `@dependabot recreate`. `@dependabot recreate` force-pushes a fresh branch containing *only* Dependabot's own commit(s), silently discarding any manual commits that were on the branch. This happened on PR #78 (eslint 8→10): a flat-config migration commit was pushed to unblock CI, `@dependabot rebase` was tried, Dependabot refused, `@dependabot recreate` was then used (by the user, on GitHub) to force a rebase — which wiped the migration commit and brought back the original CI failure. It had to be redone from scratch on the recreated branch. See the memory file `dependabot_rebase_drops_manual_commits.md` for the full account.
   **Practical consequence**: if you must push a manual fix to a Dependabot PR, warn the user first that a later rebase/recreate cycle may erase it, and be ready to reapply the fix on the recreated branch rather than assuming it survives.

3. **Grouped Dependabot PRs can be replaced, not just rebased.** When a grouped update (e.g. "development-dependencies group") gets a new commit added upstream to the group during a rebase, Dependabot sometimes closes the old PR number and opens a new one with an updated title/diff (observed: #82 → #84). Re-run `gh pr list` after any merge instead of tracking PR numbers you captured earlier.

## Steps

1. **Discover the work**

   ```bash
   gh pr list --state open --json number,title,author,mergeStateStatus,mergeable,isDraft,headRefName
   ```

   Filter to `author.login` of `app/dependabot` (skip drafts). Sort ascending by number — that's chronological order for Dependabot's own PRs and matches how this repo's grouped updates tend to layer (github-actions / patch bumps first, riskier major bumps last).

   Resolve the SonarQube project key once, up front, and reuse it for the whole run:

   ```
   mcp__sonarqube__search_my_sonarqube_projects  q: "<repo short name>"
   ```

   (Check `.sonarlint/connectedMode.json` or `sonar-project.properties` first if either exists — this repo has neither, so `search_my_sonarqube_projects` is the source of truth.)

2. **For each PR, in order: check readiness**

   ```bash
   gh pr view <N> --json number,mergeStateStatus,mergeable,statusCheckRollup
   ```

   Also check the SonarQube quality gate (PR-decorated analysis, not the main branch):

   ```
   mcp__sonarqube__get_project_quality_gate_status  projectKey: <key>  pullRequest: "<N>"
   ```

   A PR is **safe to merge** only when all of these hold:
   - `mergeStateStatus` is `CLEAN` and `mergeable` is `MERGEABLE`
   - every check in `statusCheckRollup` is `COMPLETED` with `conclusion` `SUCCESS` (treat `NEUTRAL`, e.g. CodeQL with no findings, as fine; `SKIPPED` is fine when a preceding required job also skipped for a benign reason — verify why before waving it through)
   - the SonarQube quality gate `status` is `"OK"`

   If all true → **Step 4 (merge)**. Otherwise go to **Step 3**.

3. **Handle "not yet safe"**

   - **`mergeStateStatus: DIRTY` / `mergeable: CONFLICTING`, and this PR touches `package.json`/lockfile**: this is very likely fallout from an earlier merge in this same run. Do not touch the branch. Poll (don't block with plain `sleep`) until it clears:

     ```bash
     # Monitor tool, not a bash sleep loop — see tool description for the pattern:
     # poll `gh pr view <N> --json mergeStateStatus,mergeable` every ~20-30s,
     # emit on change, stop when CLEAN/MERGEABLE or on a real failure.
     ```

     Dependabot usually rebases on its own within a few minutes of the base branch moving. If it hasn't after several minutes, you may nudge it once with `gh pr comment <N> --body "@dependabot rebase"` — but see gotcha #2 above before doing this on any PR you've manually edited.

   - **`statusCheckRollup` shows a genuine `FAILURE`** (not just a stale/conflicting merge state): pull the logs before assuming anything —

     ```bash
     gh pr checks <N>
     gh run view <run-id> --log-failed
     ```

     Classify what you find:
     - **Infra flake** (network blip, transient runner issue, unrelated to the diff): re-run once (`gh run rerun <run-id> --failed`) and re-check.
     - **Real break caused by the bump** (e.g. a major-version change requiring migration, like ESLint 9+'s flat-config requirement): this is a judgment call with production impact. **Stop and ask the user** (`AskUserQuestion`) how to proceed — options are typically: skip it for now, do the migration and merge, or close the PR. Do not decide unilaterally and do not merge a red check.

   - **Quality gate `status` is not `"OK"`**: read the failing `conditions`, summarize what regressed, and ask the user before merging — a passing CI with a failing quality gate is still not "safe to merge" per this repo's bar.

4. **Merge**

   ```bash
   gh pr merge <N> --squash --delete-branch=false
   ```

   `--delete-branch=false` keeps the branch around (cheap, reversible); ask the user if they'd rather branches get cleaned up automatically. After merging, immediately re-run `gh pr list --state open ...` — the merge just changed the lockfile, which will flip other open PRs to `DIRTY`. That's expected (gotcha #1); loop back to Step 2/3 for the next PR rather than assuming a fixed queue.

5. **If a fix is needed on a PR's branch (major-bump migrations, etc.)**

   Only after the user has confirmed you should do this (Step 3). Work directly in the main working directory rather than an external worktree (sandbox restricts writes to the working directory) — `git stash` any unrelated local changes first, then:

   ```bash
   git fetch origin <pr-branch>
   git checkout <pr-branch>          # or: git checkout -b <tmp-name> origin/<pr-branch> if the branch already exists locally with diverged history
   # ...make the minimal fix...
   pnpm install && pnpm lint && pnpm build && pnpm test   # full local validation before pushing
   git add <specific files>          # never -A/.
   git commit -m "..."               # end with the repo's Co-Authored-By trailer if one applies
   git push origin <local-branch>:<pr-branch>
   git checkout main
   git stash pop                     # restore anything you stashed
   ```

   Never `git reset --hard` or force-push to make this easier — if the local branch has diverged from a force-pushed remote (e.g. after a Dependabot recreate), delete the stale local branch and re-checkout from `origin/<pr-branch>` fresh instead.

   Wait for CI to go green on the new commit (Monitor loop on `statusCheckRollup`) and re-check the SonarQube quality gate before merging (Step 4).

6. **Repeat until done**

   Keep looping Steps 2–5 until `gh pr list --state open --json number,author` shows no more Dependabot PRs. Re-fetch the list after every merge rather than working off a snapshot (gotcha #3).

7. **Wrap up**

   Summarize: what merged, what needed a manual fix and why, anything skipped or closed at the user's direction, and any process improvement worth proposing (e.g. this session's outcome: adding an `ignore` rule in `.github/dependabot.yml` for `version-update:semver-major` so future major bumps don't land as routine PRs). Propose config changes like that rather than committing them without asking — they're a durable policy change, not a one-off merge.

**Guardrails**
- Never merge a PR with a red check or a failing SonarQube quality gate.
- Never resolve a `DIRTY`/`CONFLICTING` merge state by hand-editing/rebasing a Dependabot branch yourself — wait for Dependabot, or nudge it with `@dependabot rebase` (never `@dependabot recreate` without first warning the user it will erase any manual commits on the branch).
- Never `git reset --hard`, force-push, or use `git add -A`/`.` while working on a PR branch.
- Always run the full local validation suite (`pnpm lint && pnpm build && pnpm test`) before pushing a manual fix commit.
- Stop and use `AskUserQuestion` for: any genuine CI failure, any merge conflict that isn't explained by another in-flight Dependabot merge, any major-version bump that needs code changes beyond the dependency bump itself, and any quality-gate regression.
- Don't invent or apply dependabot.yml / CI policy changes without asking first — propose them in the wrap-up.
