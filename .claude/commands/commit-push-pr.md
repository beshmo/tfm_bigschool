---
name: "Commit, Push, PR"
description: Inspect repo state, group changes into logical commits, push to origin, and open a documented draft PR against main
category: Workflow
tags: [git, github, workflow]
---

Inspect the current repository state, group related changes into one or more well-described commits, push the branch to `origin`, and open a **draft** pull request against `main` with a clear description.

**Input**: None required. Optionally the user may pass a branch name or PR title hint after the command; use it if present, otherwise infer sensibly.

**Steps**

1. **Inspect state (run in parallel)**
   - `git status` (never `-uall`) to see staged/unstaged/untracked files
   - `git diff` and `git diff --staged` to see actual changes
   - `git branch --show-current` to confirm we're not on `main`/`master`
   - `git log main..HEAD --oneline` (or equivalent) if commits already exist on this branch
   - `git log -10 --oneline` to match the repo's commit message style

   If there are no changes at all (clean tree, nothing ahead of main), stop and tell the user there's nothing to commit/push.

   If currently on `main`, **do not commit directly to it**. Ask the user for a branch name (or propose one derived from the change, e.g. `feat/short-description`) and create it before proceeding.

2. **Check for anything risky before staging**
   - Look for files that might contain secrets (`.env`, credentials, keys) even if the name looks innocuous — read contents if suspicious and warn the user before including them.
   - Note any large/binary files that seem accidental.

3. **Group changes into logical commits**

   Read the diffs and cluster changed files by *purpose*, not just by directory — e.g. separate an unrelated formatting change from a feature change, separate test updates that belong with their source change (keep those together), separate docs-only changes if they're unrelated to the code change.

   For each group:
   - `git add <specific files>` (never `git add -A`/`.` blindly — review what a broad add would sweep in)
   - Draft a concise commit message (1–2 sentences, focused on *why*) matching the repo's existing style (check `git log` for conventions like `feat:`/`fix:`/`docs:` prefixes, e.g. this repo uses them)
   - Commit with the message

   If everything genuinely belongs to one coherent change, a single commit is fine — don't split artificially.

4. **Confirm before pushing**

   Show the user the commits about to be pushed (`git log main..HEAD --oneline` or the branch's diff-log) and the target branch name. Since pushing is a shared/visible action, state clearly what will happen and proceed only if not previously declined in this session. (Per this project's safety rules, pushing code is an action that needs the user's go-ahead in chat — if it hasn't been given yet for this specific push, ask first.)

5. **Push**

   ```bash
   git push -u origin <branch-name>
   ```

6. **Open a draft PR against main**

   Gather PR content from the full set of commits on the branch (not just the latest), via `git log main...HEAD` and `git diff main...HEAD`. Draft:
   - **Title**: short, under ~70 chars
   - **Body**, using a heredoc with `gh pr create --draft`:
     ```
     ## Summary
     - <1-3 bullets on what changed and why>

     ## Test plan
     - [ ] <how this was/should be verified>
     ```

   ```bash
   gh pr create --draft --base main --title "<title>" --body "$(cat <<'EOF'
   <body>
   EOF
   )"
   ```

7. **Report result**

   Return the PR URL from `gh pr create` output to the user.

**Guardrails**
- Never commit directly to `main`/`master` — always work on a feature branch.
- Never use `git add -A` / `git add .` — stage named files after reviewing them.
- Never force-push.
- Never use `--no-verify` or skip hooks.
- If a pre-commit hook fails, fix the issue and create a new commit — never amend past a failed hook.
- Always create the PR as **draft**, targeting `main`, using `gh`.
- Confirm with the user before the push (a visible, hard-to-reverse action) unless they've already explicitly authorized it in this conversation.
- Do not fabricate PR content — base the description on the actual diff and commit history.
