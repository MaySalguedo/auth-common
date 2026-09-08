# Release Notes — v1.2.0

> **Target:** `develop` → `main` | **Date:** 2026-09-08 | **Scope:** `@may-salguedo/auth-common` (npmjs) / `@MaySalguedo/auth-common` (GH Packages) | **Compare:** `main...develop`

This release adds the `@HasAttribute()` parameter decorator for handler-level boolean checks on JWT payload attributes, plus matching README coverage. Fully additive — no breaking changes.

---

## Highlights

- **New Feature:** `@HasAttribute()` — handler-param boolean injection answering "does `req.user` contain this attribute value?", covering nested dot-paths and array-aware semantics, with no `@Req()` import and no throw on public routes — `feat(decorator): HasAttribute` (#10, resolves #9, links #1 and #6)
- **DX:** `README.md` `@HasAttribute()` showcase with examples, behavior table, composition notes, and v1 scope limits
- **Chore:** Version bumped to `1.2.0`

---

## Detailed Changes

### 1. Features — `feat(decorator): add HasAttribute param decorator` (#10) — `Resolves #9, links #1 and #6`

**Motivation:** `@RequireAttribute()` (#1) enforces attributes at route level with `403`, and `@AuthUser()` (#6) injects the whole user — but handlers had no way to *branch* on a single JWT attribute without re-implementing dot-path + array resolution manually or misusing route-level enforcement that cannot express `if/else`.

**Implementation:**
- `src/common/decorators/has-attribute.decorator.ts:6` — `extractHasAttribute(payload, path, value)`, pure check composing `getFlattenedByPath` + `matchesAttribute` (`RequireAttribute` semantics: dot-path, transparent array flattening, scalar `includes` (`===`), array-expected `EVERY`, empty-expected `false`); returns `false` on `null`/`undefined` payload, never throws
- `src/common/decorators/has-attribute.decorator.ts:15` — `hasAttributeFactory(data, ctx)`, reads `req.user` via reused `extractAuthUser` (`AuthUser` plumbing, `RequireAttributeRule` shape); missing user/request → `false`
- `src/common/decorators/has-attribute.decorator.ts:23` — `HasAttribute(path, value)`, `createParamDecorator` factory: `@HasAttribute('roles','admin') hasAdmin: boolean`
- `src/common/decorators/decorators.spec.ts` — consolidated `extractHasAttribute` (AC1–AC6) + `hasAttributeFactory` (match/mismatch/AC7/missing request) + `HasAttribute` factory suites
- `src/index.ts:17` — barrel export for the new decorator

**Usage:**
```typescript
import { HasAttribute } from '@may-salguedo/auth-common';

// scalar: payload { role: 'admin' }
@Get('admin') getAdmin(@HasAttribute('role', 'admin') isAdmin: boolean) {}

// nested: payload { organization: { plan: 'pro' } }
@Get('billing') getBilling(@HasAttribute('organization.plan', 'pro') isPro: boolean) {}

// arrays: payload { roles: ['admin','editor'] } / { permissions: ['read','write'] }
@Get('write') getWrite(@HasAttribute('permissions', ['read', 'write']) canWrite: boolean) {}

// flattened: payload { orgs: [{role:'viewer'}, {role:'admin'}] }
@Get('org-admin') getOrgAdmin(@HasAttribute('orgs.role', 'admin') isOrgAdmin: boolean) {}

// public route without user → false, no throw
@PublicGuard()
@Get('open') getOpen(@HasAttribute('roles', 'admin') hasAdmin: boolean) {}
```

**Verified:** `pnpm test`/`pnpm test:cov` 157/157 across 8 suites (`has-attribute.decorator.ts` 100% stmts/branches/funcs/lines, global ≥90% per `package.json`), `pnpm lint:no-spec`/`pnpm lint`/`pnpm check`/`pnpm build` green, root export resolves from `dist/index.js`.

### 2. Docs — `README.md` HasAttribute showcase

**Motivation:** New public API needs discoverable documentation consistent with the existing `@RequireAttribute()` / `@AuthUser()` sections.

**Implementation:**
- ToC, Overview decorator list, and Features entries for `@HasAttribute()`
- New `### @HasAttribute()` section with five usage examples, behavior table (`true`/`false` matrix), composition notes (multiple params via handler logic; enforcement stays with `@RequireAttribute()`, whole user with `@AuthUser()`), and v1 scope limits

**Verified:** `pnpm check` green (docs-only delta), ToC anchors verified.

---

## Issues

- #9 — `[PITCH] - HasAttribute param decorator for handler-level boolean checks` — **CLOSED** (resolved by this release)
- #1 — `[PITCH] - RequireAttribute decorator for JWT payload validation (nested + arrays) via JwtGuard` — **CLOSED** (linked: attribute semantics reused)
- #6 — `[PITCH] - AuthUser decorator for typed req.user access` — **CLOSED** (linked: request plumbing reused)

## Commits

- `30cdcd9` — `feat(decorator): add HasAttribute param decorator for handler-level boolean checks` (+159: new decorator, barrel export, consolidated specs)
- `docs(readme): HasAttribute showcase` — `README.md` (+82/-1: ToC, Overview, Features, new `### @HasAttribute()` section)
- `chore(release): bump to v1.2.0` — `package.json:3`, `README.md:9` badge, this file

## Pull Requests

- #10 — `feat(decorator): add HasAttribute param decorator for handler-level boolean checks` (`feat/has-attribute` → `develop`) — **MERGED**
- *(this release)* `develop` → `main` — **PENDING** (merge, then tag `v1.2.0`)

Full diff: `main...develop` — 4 files, +241/-1 approx (feature + docs + version).

---

## Breaking Changes

- **API:** None — purely additive export. Existing `@RequireAttribute()` enforcement and `@AuthUser()` injection keep working unchanged.
- **Release process:** `RELEASE_NOTES.md` must be committed before `git tag v*` — `cd.yml` will fail if missing (intentional, curated notes).

## Migration Guide

```bash
# No package migration — scope stays @may-salguedo/auth-common

# Optional: Adopt HasAttribute for handler branching (replaces manual user inspection)
import { HasAttribute } from '@may-salguedo/auth-common';
@Get('admin') getAdmin(@HasAttribute('roles', 'admin') isAdmin: boolean) {}

# Release: write RELEASE_NOTES.md, then tag
git tag v1.2.0 && git push origin v1.2.0 # triggers CD: wait-for-ci → setup → trivy-scan → publish-npmjs + publish-github → release --notes-file
```

## Contributors

- @MaySalguedo — all changes
- CI: `ci.yml` + `cd.yml` + `scripts/` + `trivy.yaml` + `docker-compose.yml`

---

## Checklist for Release

- [x] `RELEASE_NOTES.md` committed (this file)
- [ ] `git tag v1.2.0 && git push origin v1.2.0` triggers `cd.yml`
- [ ] Verify `npm view @may-salguedo/auth-common version` and `GH Packages @MaySalguedo/auth-common` + `gh release view v1.2.0 --json body` matches this file
