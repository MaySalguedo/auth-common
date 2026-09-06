# Release Notes — v1.0.8

> **Target:** `develop` → `main` | **Date:** 2026-09-06 | **Scope:** `@MaySalguedo/auth-common` | **Compare:** `main...develop`

This release consolidates the library rename, CI/CD modernization, and the new declarative JWT attribute validation feature into a single curated release.

---

## Highlights

- **New Feature:** `@RequireAttribute()` — declarative per-route JWT payload validation (nested + array-aware) enforced in `JwtGuard` — `feat(auth): RequireAttribute` (#2)
- **Breaking Chore:** Package scope unified to `@MaySalguedo/auth-common` (`package.json:2`) — correct GitHub Packages case-sensitive publishing — `chore(release): align package scope` (#4)
- **CI/CD:** CI now runs on every branch (`ci.yml:3-6` `branches: ['**']`), release is file-driven via `RELEASE_NOTES.md` (`cd.yml:134` `--notes-file`), obsolete `jq` rewrite removed (`scripts/publish-github-packages.sh:2`)
- **DX:** New PR and Issue templates (`PULL_REQUEST_TEMPLATE/`, `ISSUE_TEMPLATE/chore_request.md`), `README.md` showcases `RequireAttribute` with tables and error format

---

## Detailed Changes

### 1. Features — `feat(auth): add RequireAttribute decorator` (#2) — `Related to #1`

**Motivation:** Services using `AuthCommonModule.forRoot()` + `OrchestratorGuard`/`JwtGuard` had no declarative way to require a JWT payload attribute (especially nested `organization.plan` or arrays `roles: ['admin','editor']`, `orgs: [{role:'admin'}]`). Workaround was duplicated `if (!user.roles?.includes('admin')) throw ForbiddenException` per handler or bespoke per-attribute `CanActivate`.

**Implementation:**
- `src/common/tokens/require-attribute-key.token.ts:1` — new `REQUIRE_ATTRIBUTE_KEY` metadata token
- `src/common/interfaces/require-attribute-rule.interface.ts:4` — `RequireAttributeRule { path: string, value: unknown }`
- `src/common/decorators/require-attribute.decorator.ts:5` — `RequireAttribute(path, value): MethodDecorator & ClassDecorator` with stacking via `Reflect.getMetadata` + `SetMetadata([...existing, {path,value}])` for both method and class level
- `src/common/utils/get-nested-value.ts:1` — `getFlattenedByPath(obj, path)` (dot-path split, `filter(Boolean)`, array flattening), `matchesAttribute(actual: unknown[], expected: unknown)` (`Array.isArray(expected) ? every includes : includes`), `formatAttributeValue`
- `src/core/guards/jwt/jwt.guard.ts:12` — `JwtGuard.canActivate` now after `super.canActivate`: `reflector.getAllAndOverride(REQUIRE_ATTRIBUTE_KEY, [handler, class])`, iterates rules, `getFlattenedByPath(user, path)`, `matchesAttribute`, throws `ForbiddenException` with `Attribute '${path}' expected ${formatAttributeValue(value)} but got ${formatAttributeValue(actual)}`
- `src/index.ts:11,15` — exports `REQUIRE_ATTRIBUTE_KEY` and `RequireAttribute`
- `src/core/guards/jwt/jwt.guard.spec.ts:1` (299 new lines), `src/common/utils/utils.spec.ts:1` (253 lines), `src/common/decorators/decorators.spec.ts:1` (219 lines), `src/core/guards/orchestrator/orchestrator.guard.spec.ts:27` — full AC1-AC10 + edge harness (`null`, `undefined`, `[]`, `{}`, malformed `a..b`)
- `tsconfig.json:6` — `@utils/*` alias + `isolatedModules`, `jest` config aligned
- `README.md` — new `## Features` bullet `✅ Attribute validation`, `Table of Contents` → `@RequireAttribute()`, full `### @RequireAttribute()` section with examples, behavior table (`includes` vs `EVERY`, `403` handling, `@PublicGuard` bypass), `Token Reference` adds `REQUIRE_ATTRIBUTE_KEY`
- `.gitignore:62-63` — keep local pitch draft `issue.md`/`pull_request.md` out of index

**Usage:**
```typescript
import { RequireAttribute } from '@MaySalguedo/auth-common';

@RequireAttribute('role', 'admin') // scalar
@RequireAttribute('organization.plan', 'pro') // nested
@RequireAttribute('roles', 'admin') // array includes
@RequireAttribute('permissions', ['read','write']) // array EVERY
@RequireAttribute('orgs.role', 'admin') // flattened
@Get('admin') getAdmin() {}

// stacked = AND
@RequireAttribute('roles','admin')
@RequireAttribute('tenant','acme')
@Get('dashboard') getDashboard() {}
```

**Verified:** `pnpm test`/`pnpm test:cov` ≥90% (`package.json:82`), `pnpm lint:no-spec`/`pnpm check` green, bench ≤2ms per call, no new `eslint` errors.

**Merged:** `b9f978a` → `fcb09c5` → `Merge #2` `413f66a`

### 2. Chore — `chore(release): align package scope and streamline CI/CD` (#4)

**Motivation:** `ci.yml` only `main`/`develop` delayed feedback; `package.json:2` lowercase hyphen vs GH Packages case-sensitive `MaySalguedo` required runtime `jq` rewrite; `--generate-notes` did not allow curated `RELEASE_NOTES.md`; docs drifted.

**Implementation:**
- `ci.yml:3-6` — `on: push: branches: ['**']` + `pull_request:` (no base filter), keep `concurrency: cancel-in-progress`, `test-coverage` stays gated `ci.yml:77-81` (`main`/`develop` only) to limit Docker cost
- `package.json:2` — `"name": "@MaySalguedo/auth-common"` (unified source of truth)
- `scripts/publish-github-packages.sh:2` — removed `jq '.name = "@MaySalguedo/auth-common"'` (registry-only: `@MaySalguedo:registry=https://npm.pkg.github.com` + auth token, `npm publish --access public`)
- `cd.yml:134` — `gh release create "${{ github.ref_name }}" --notes-file RELEASE_NOTES.md --target "${{ github.sha }}"` (file-driven, you write `RELEASE_NOTES.md` before tag)
- `README.md:3,68,89,178,195,223,229,256,350,382,513` — all installs/imports `@MaySalguedo/auth-common`, `pnpm install /.../MaySalguedo-auth-common-*.tgz`
- `pnpm-lock.yaml` refresh (557 lines) from `pnpm install`
- `pnpm pack` now `MaySalguedo-auth-common-*.tgz`

**Verified:** `pnpm build` → `MaySalguedo-auth-common-1.0.7.tgz`, `pnpm lint:no-spec`/`pnpm check` green, `act` CI simulation passes.

**Merged:** `07dc022` → `Merge #4` `fcebf1a`

### 3. Templates & Tooling

- `PR Templates`: `.github/PULL_REQUEST_TEMPLATE/feature.md`, `fix.md`, `chore.md` (generic/referential, no UI, `Related to #` without auto-close)
- `Issue Templates`: `.github/ISSUE_TEMPLATE/chore_request.md` (`labels: chore`, sections Context→Additional Context) alongside `feature_request.md` (`labels: enhancement`)
- `.gitignore:62-64` — `pull_request.md` + `issue.md` local drafts ignored, `.github/PULL_REQUEST_TEMPLATE/` untracked until added
- `README.md:252-341,455,509-532` — comprehensive `RequireAttribute` showcase, `REQUIRE_ATTRIBUTE_KEY` token, recent `pnpm pack`/`compile` docs

---

## Breaking Changes

- **Package rename:** `@may-salguedo/auth-common` → `@MaySalguedo/auth-common` (scope case + hyphen removal). **Impact:** Consumers must `pnpm remove @may-salguedo/auth-common && pnpm add @MaySalguedo/auth-common` and update all `from '@may-salguedo/auth-common'` → `from '@MaySalguedo/auth-common'`. `npm` lowercases display to `@maysalguedo` but GH Packages preserves `MaySalguedo` case — `NPM_TOKEN` must have `publish` on `@MaySalguedo`.
- **Release process:** `RELEASE_NOTES.md` must be committed before `git tag v*` — `cd.yml:134` will fail if missing (intentional, curated notes).

## Migration Guide

```bash
# 1. Update dependency
pnpm remove @may-salguedo/auth-common
pnpm add @MaySalguedo/auth-common

# 2. Replace imports (project-wide)
# find src -type f -name "*.ts" | xargs sed -i "s/@may-salguedo\/auth-common/@MaySalguedo\/auth-common/g"

# 3. Optional: Adopt RequireAttribute (replace manual if checks)
import { RequireAttribute } from '@MaySalguedo/auth-common';
@RequireAttribute('roles','admin')
@Get('admin') getAdmin() {}

# 4. Release: write RELEASE_NOTES.md, then tag
git tag v1.0.8 && git push origin v1.0.8 # triggers CD: wait-for-ci → setup → trivy-scan → publish-npmjs + publish-github → release --notes-file
```

## What's Changed — Commits & PRs

- `feat(auth): RequireAttribute` (#2) — `b9f978a`, `c73cab6`, `fcb09c5`, merge `413f66a` — `Related to #1`
- `chore(release): align package scope` (#4) — `07dc022`, `d8d8818`, merge `fcebf1a` — `Closes chore issue #3`
- `feat(templates): PULL_REQUEST_TEMPLATE` — `c73cab6`
- `feat(template): chore issue template` — `d8d8818`

Full diff: `main...develop` — 26 files, +1375/-400, 1246 new test lines.

## Contributors

- @MaySalguedo — all changes
- CI: `ci.yml` + `cd.yml` + `scripts/` + `trivy.yaml` + `docker-compose.yml`

---

## Checklist for Release

- [x] `RELEASE_NOTES.md` committed (this file)
- [ ] `git tag v1.0.8 && git push origin v1.0.8` triggers `cd.yml`
- [ ] Verify `npm view @MaySalguedo/auth-common version` and `GH Packages` + `gh release view v1.0.8 --json body` matches this file
