# GitHub Copilot Instructions

## Autonomous workflow

Copilot CLI is authorized to work autonomously on this repository with the following rules:

### ✅ Allowed without asking
- Commit code changes to any non-protected branch
- Push commits to remote feature branches
- Create pull requests targeting `main`

### ❌ Not allowed — hand off to the repo owner
- Merging pull requests (the owner reviews and merges)
- Pushing directly to `main` or any protected branch
- Bypassing branch protection rules or required status checks
- Approving pull requests

## Workflow
1. Make changes on a feature branch (e.g. `feature/my-fix`)
2. Commit and push the branch
3. Open a pull request to `main` with a clear description
4. **Stop** — the owner takes over from here (review, approve, merge)

## Commit messages
- Use conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`
- Always include the Co-authored-by trailer:
  ```
  Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
  ```
