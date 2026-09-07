# Contributing to auth-common

Thank you for contributing. This guide covers the full workflow: setup, branches, commits, checks, pull requests, and releases.

## Prerequisites

- Node.js 24 (see `.github/workflows/ci.yml`)
- pnpm 11.25 (`packageManager` in `package.json`)
- Install dependencies with `pnpm install --frozen-lockfile`

## Project layout

- `src/common/` — decorators, tokens, interfaces, utils, exceptions
- `src/core/` — guards, strategies, module wiring
- `src/index.ts` — public entrypoint; every public symbol must be exported here
- Path aliases (`tsconfig.json`, mirrored in the Jest `moduleNameMapper`):
  `@tokens`, `@guards`, `@decorators`, `@interfaces`, `@strategies`, `@utils`

## Branching

- Branch off `develop` using `feat/*`, `fix/*`, or `chore/*` (e.g. `feat/auth-user`)
- `main` is release-only and updated exclusively through release PRs

```bash
git checkout develop && git pull && git switch -c feat/my-feature
```

## Issues

- Open issues from `.github/ISSUE_TEMPLATE/`
- Draft locally in `ISSUE.md` (gitignored) and create with `gh issue create --title "..." --label ... --body-file ISSUE.md`

## Commits

- Conventional format with a bullet body:

```
prefix(scope): one line description

- bullet points
```

- Prefixes in use: `feat`, `refactor`, `fix`, `chore`, `docs`

## Code style

- Prettier (`singleQuote`, `trailingComma: all`); run `pnpm format` before pushing
- ESLint type-checked config; no code comments
- One `file.spec.ts` tests per-folder **NEVER** per-file;

## Checks before pushing

Do not rely on the local `pnpm` scripts alone. Before pushing, run the actual CI workflow locally with `act`, exactly as described in [Testing GitHub Actions locally with `act`](./README.md#testing-github-actions-locally-with-act):

```bash
act -l

# Push to develop
act -W .github/workflows/ci.yml -e .github/events/push-develop.json

# PR against develop
act -W .github/workflows/ci.yml -e .github/events/pull-request-develop.json
```

- The push must leave every CI job green (`audit`, `linter`, `check`, `test-coverage`)
- Coverage gates: >= 90% branches, functions, lines, statements (`package.json`)
- The `test-coverage` CI job runs unit tests in Docker and only on `main` / `develop` (see `ci.yml`)
- Security: `pnpm audit` and `pnpm audit:trivy`

## Pull requests

- Target `develop`; follow the root `PULL_REQUEST.md` format (Summary / Related Issues / Changes / Validation / Checklist / Next Steps) or the `.github/PULL_REQUEST_TEMPLATE/` variants
- Draft locally in `PULL_REQUEST.md` (gitignored) and create with:

```bash
gh pr create --base develop --head feat/my-feature --title "feat(scope): description" --body-file PULL_REQUEST.md
```

### Forks

- Forks are allowed. Fork the repository, push your branch to your fork, and open the PR against `develop` from there:

```bash
gh pr create --base MaySalguedo/auth-common:develop --head my-username:feat/my-feature --title "feat(scope): description" --body-file PULL_REQUEST.md
```

- CI runs on PRs from forks exactly like branch PRs, so the [Checks before pushing](#checks-before-pushing) requirement applies equally
- A maintainer reviews every fork PR before merging; only contributors with repository access can approve and merge

## Releases (maintainers)

- Release PRs (`develop` → `main`), tags, and publishes can only be performed by contributors with repository access
- Merge `develop` → `main` through a release PR
- Write curated `RELEASE_NOTES.md` before tagging; `cd.yml` consumes it via `gh release create --notes-file RELEASE_NOTES.md`
- Tag and push (`git tag v#.#.# && git push origin v#.#.#`) to trigger npmjs + GitHub Packages publishing and the GitHub release
