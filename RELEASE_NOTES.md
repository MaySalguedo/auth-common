# Release Notes — v1.1.0

> **Target:** `develop` → `main` | **Date:** 2026-09-07 | **Scope:** `@may-salguedo/auth-common` (npmjs) / `@MaySalguedo/auth-common` (GH Packages) | **Compare:** `main...develop`

This release adds the generic `@AuthUser()` parameter decorator for typed `req.user` access, plus the contributor guide and matching README coverage. Fully additive — no breaking changes.

---

## Highlights

- **New Feature:** `@AuthUser()` — generic handler-param injection of `req.user`, covering object payloads (`T & TokenIssues`) and raw JWT strings, with no `@Req()` import — `feat(decorator): AuthUser` (#7, related to #6)
- **DX:** New `CONTRIBUTING.md` (setup, branches, commits, `act`-based checks, PRs + forks, releases) and `README.md` `@AuthUser()` showcase with behavior table
- **Chore:** Gitignored local drafts renamed to `ISSUE.md` / `PULL_REQUEST.md` (`.gitignore:63-64`), version bumped to `1.1.0`

---

## Detailed Changes

### 1. Features — `feat(decorator): add AuthUser param decorator` (#7) — `Related to #6`

**Motivation:** Every protected handler imported `@Req()` / `@Request()` from `@nestjs/common` just to reach `req.user`, then manually cast it to the caller's payload type. Repetitive, untyped by default, and easy to drift between `object + TokenIssues` vs `string` JWT usages. No helper existed in `src/index.ts` or `src/common/decorators/`.

**Implementation:**
- `src/common/decorators/auth-user.decorator.ts:3` — `extractAuthUser<T>(ctx)`, reads `req.user` via `switchToHttp().getRequest()`, returns `undefined` when absent, never throws
- `src/common/decorators/auth-user.decorator.ts:8` — `authUserFactory<T>(_data, ctx)` named `createParamDecorator` factory, directly unit-testable
- `src/common/decorators/auth-user.decorator.ts:15` — `AuthUser<T = unknown>()`, generic decorator factory: `@AuthUser<MyPayload>()` / `@AuthUser<string>()`
- `src/common/decorators/decorators.spec.ts` — consolidated `extractAuthUser` + `AuthUser` suites (object + `TokenIssues`, string JWT, missing user, missing request, factory independence)
- `src/index.ts:16` — barrel export for the new decorator

**Usage:**
```typescript
import { AuthUser, TokenIssues } from '@may-salguedo/auth-common';

interface MyPayload { sub: string; role: string; }

// object payload: { sub: '123', role: 'admin', iat: 1, exp: 2 }
@Get('me') getMe(@AuthUser<MyPayload>() user: MyPayload & TokenIssues) {}

// raw JWT string
@Get('token') getToken(@AuthUser<string>() token: string) {}

// public route without user → undefined, no throw
@PublicGuard()
@Get('open') getOpen(@AuthUser<MyPayload>() user: MyPayload & TokenIssues | undefined) {}
```

**Verified:** `pnpm test`/`pnpm test:cov` 144/144 across 8 suites (`auth-user.decorator.ts` 100% stmts/branches/funcs/lines, global ≥90% per `package.json`), `pnpm lint:no-spec`/`pnpm check`/`pnpm build` green, root export resolves from `dist/index.js`.

**Merged:** `08a273d` → `Merge #7` `ac7693b` — `Related to #6`

### 2. Docs — `docs(contributing): guide + showcase`

**Motivation:** `README.md` had no `@AuthUser()` documentation, no contributor workflow existed, and the `Table of Contents` linked to a missing `## Contributing` section.

**Implementation:**
- `CONTRIBUTING.md:1` (new) — prerequisites (Node 24, pnpm 11.25), layout + path aliases, `feat/*` branching off `develop`, conventional commits, `act`-based CI checks, fork-PR flow, maintainer-only releases
- `README.md` — new `### @AuthUser()` section with object + string examples, behavior table, and v1 scope limits; ToC, Features, and Overview entries; missing `## Contributing` section added
- `.gitignore:63-64` — local drafts renamed `issue.md`/`pull_request.md` → `ISSUE.md`/`PULL_REQUEST.md` with all references updated (`CONTRIBUTING.md`, release notes)
- `package.json:3` + `README.md:9` — version bumped to `1.1.0`, badge refreshed

**Verified:** `pnpm check` green (docs-only, no `src/` change), zero stale lowercase draft references (grep clean), renamed drafts still gitignored (`git check-ignore` verified).

**Merged:** `6bd11f2` + version bump — on `develop`, release PR pending.

---

## Breaking Changes

- **API:** None — purely additive export. Existing `@Req()` + cast code keeps working unchanged.
- **Release process:** `RELEASE_NOTES.md` must be committed before `git tag v*` — `cd.yml:134` will fail if missing (intentional, curated notes).

## Migration Guide

```bash
# No package migration — scope stays @may-salguedo/auth-common

# Optional: Adopt AuthUser (replace manual req.user casts)
import { AuthUser, TokenIssues } from '@may-salguedo/auth-common';
@Get('me') getMe(@AuthUser<MyPayload>() user: MyPayload & TokenIssues) {}

# Release: write RELEASE_NOTES.md, then tag
git tag v1.1.0 && git push origin v1.1.0 # triggers CD: wait-for-ci → setup → trivy-scan → publish-npmjs + publish-github → release --notes-file
```

## What's Changed — Commits & PRs

- `feat(decorator): AuthUser` (#7) — `08a273d`, merge `ac7693b` — `Related to #6`
- `docs(contributing): guide + showcase + renames` — `6bd11f2`
- `chore(release): bump to v1.1.0` — `package.json:3`, `README.md:9` badge, this file

Full diff: `main...develop` — 10 files, +430/-10 approx (feature + docs + version).

## Contributors

- @MaySalguedo — all changes
- CI: `ci.yml` + `cd.yml` + `scripts/` + `trivy.yaml` + `docker-compose.yml`

---

## Checklist for Release

- [x] `RELEASE_NOTES.md` committed (this file)
- [ ] `git tag v1.1.0 && git push origin v1.1.0` triggers `cd.yml`
- [ ] Verify `npm view @may-salguedo/auth-common version` and `GH Packages @MaySalguedo/auth-common` + `gh release view v1.1.0 --json body` matches this file
