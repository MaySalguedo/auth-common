# Release Notes — v1.3.0

> **Target:** `develop` → `main` | **Date:** 2026-09-10 | **Scope:** `@may-salguedo/auth-common` (npmjs) / `@MaySalguedo/auth-common` (GH Packages) | **Compare:** `main...develop`

This release adds the `@Headers()` and `@Session()` parameter decorators for handler-level HTTP header and session extraction with full NestJS pipe support, plus matching README coverage. Fully additive — no breaking changes.

---

## Highlights

- **New Feature:** `@Headers()` — case-insensitive header extraction with pipe support (`@Headers('x-request-id')`, `@Headers()`, `@Headers('x-tenant-id', ParseUUIDPipe)`); matches Express `req.headers` behavior — `feat(decorators): add @Headers and @Session decorators with pipe support` (#13, resolves #12)
- **New Feature:** `@Session()` — session property or full session object extraction with pipe support (`@Session('userId')`, `@Session()`, `@Session('visitCount', ParseIntPipe)`); graceful `undefined` on missing session/request — `feat(decorators): add @Headers and @Session decorators with pipe support` (#13, resolves #12)
- **DX:** `README.md` `@Headers()` and `@Session()` showcase with examples, behavior tables, composition notes, and v1 scope limits
- **Chore:** Version bumped to `1.3.0`

---

## Detailed Changes

### 1. Features — `feat(decorators): add @Headers and @Session decorators with pipe support` (#13) — `Resolves #12`

**Motivation:** Handlers frequently need access to HTTP headers (request IDs, tenant IDs, signatures, rate limits) and session data (user IDs, visit counts, preferences). Existing solutions required manual `req.headers`/`req.session` access with no type safety, no pipe integration, and inconsistent case handling.

**Implementation:**

#### `@Headers()`
- `src/common/decorators/headers.decorator.ts:6` — `extractHeaders(ctx)`, reads `req.headers` from execution context; returns `undefined` on missing request/headers
- `src/common/decorators/headers.decorator.ts:14` — `normalizeHeaders(headers)`, lowercases all keys for case-insensitive matching (Express behavior)
- `src/common/decorators/headers.decorator.ts:22` — `headersFactory(data, ctx)`, returns specific header value (case-insensitive lookup), all headers object, or `undefined`
- `src/common/decorators/headers.decorator.ts:34` — `Headers = createParamDecorator(headersFactory)`, factory: `@Headers('x-request-id')`, `@Headers()`, `@Headers('x-tenant-id', ParseUUIDPipe)`
- `src/common/decorators/decorators.spec.ts` — `Headers` suite (61 tests): factory, `extractHeaders`, `headersFactory`, pipe integration, case-insensitivity, edge cases; 100% coverage

#### `@Session()`
- `src/common/decorators/session.decorator.ts:6` — `extractSession(ctx)`, reads `req.session` from execution context; returns `undefined` on missing request/session
- `src/common/decorators/session.decorator.ts:14` — `sessionFactory(data, ctx)`, returns specific session property, whole session object, or `undefined`
- `src/common/decorators/session.decorator.ts:22` — `Session = createParamDecorator(sessionFactory)`, factory: `@Session('userId')`, `@Session()`, `@Session('visitCount', ParseIntPipe)`
- `src/common/decorators/decorators.spec.ts` — `Session` suite (15 tests): factory, `extractSession`, `sessionFactory`, pipe integration, nested objects, arrays; 100% coverage

- `src/index.ts:18-19` — barrel exports for both decorators

**Usage:**

```typescript
import { Controller, Get } from '@nestjs/common';
import { Headers, Session } from '@may-salguedo/auth-common';
import { ParseUUIDPipe, ParseIntPipe } from '@nestjs/common';

@Controller('requests')
export class RequestsController {
  // Headers
  @Get('x-request-id') getRequestId(@Headers('x-request-id') requestId: string) {}
  @Get('headers') getAllHeaders(@Headers() headers: Record<string, string>) {}
  @Get('x-tenant-id') getTenantId(@Headers('x-tenant-id', ParseUUIDPipe) tenantId: string) {}
  @Get('x-rate-limit') getRateLimit(@Headers('x-rate-limit', ParseIntPipe) limit: number) {}

  // Session
  @Get('user-id') getUserId(@Session('userId') userId: string) {}
  @Get('all') getAllSession(@Session() session: Record<string, unknown>) {}
  @Get('visit-count') getVisitCount(@Session('visitCount', ParseIntPipe) count: number) {}
  @Get('user') getUser(@Session('user') user: { id: string; name: string }) {}
}
```

**Verified:** `pnpm test`/`pnpm test:cov` 188/188 across 8 suites (`headers.decorator.ts` 100%, `session.decorator.ts` 100%, global ≥90% per `package.json`), `pnpm lint:no-spec`/`pnpm lint`/`pnpm check`/`pnpm build` green, root export resolves from `dist/index.js`.

### 2. Docs — `README.md` @Headers & @Session showcase

**Motivation:** New public APIs need discoverable documentation consistent with the existing `@RequireAttribute()` / `@AuthUser()` / `@HasAttribute()` sections.

**Implementation:**
- ToC entries under Decorators for `@Headers()` and `@Session()`
- Features bullets for both decorators
- Overview decorator list updated
- New `### @Headers()` section with four usage examples, behavior table (`true`/`false`/`object` matrix), composition notes (pipe support, case-insensitivity), and v1 scope limits
- New `### @Session()` section with four usage examples, behavior table, composition notes (pipe support, graceful `undefined`), and v1 scope limits

**Verified:** `pnpm check` green (docs-only delta), ToC anchors verified.

---

## Issues

- #12 — `[PITCH] - Add @Header and @Session decorators for handler-level attribute extraction` — **CLOSED** (resolved by this release)

## Commits

- `ebc1b93` — `feat(decorators): add @Headers and @Session decorators with pipe support` (+60: new decorators, specs, barrel exports)
- `589baf7` — `docs(README + version)` — README v1.2.0 sync (pre-merge)
- `ce61f80` — `Merge branch 'main' into develop`
- `86e8622` — `Merge pull request #13 from MaySalguedo/feat/headers-session`

## Pull Requests

- #13 — `feat(decorators): add @Headers and @Session decorators with pipe support` (`feat/headers-session` → `develop`) — **MERGED**
- *(this release)* `develop` → `main` — **PENDING** (merge, then tag `v1.3.0`)

Full diff: `main...develop` — 6 files, +280/-1 approx (features + docs + version).

---

## Breaking Changes

- **API:** None — purely additive exports. Existing decorators (`@RequireAttribute()`, `@AuthUser()`, `@HasAttribute()`) keep working unchanged.
- **Release process:** `RELEASE_NOTES.md` must be committed before `git tag v*` — `cd.yml` will fail if missing (intentional, curated notes).

## Migration Guide

```bash
# No package migration — scope stays @may-salguedo/auth-common

# Optional: Adopt Headers/Session for type-safe handler parameters (replaces manual req.headers/req.session)
import { Headers, Session } from '@may-salguedo/auth-common';
import { ParseUUIDPipe, ParseIntPipe } from '@nestjs/common';

@Get('webhook')
handleWebhook(
  @Headers('x-signature') sig: string,
  @Headers('x-timestamp', ParseIntPipe) ts: number,
  @Session('userId', ParseUUIDPipe) userId: string,
) {}

# Release: write RELEASE_NOTES.md, then tag
git tag v1.3.0 && git push origin v1.3.0 # triggers CD: wait-for-ci → setup → trivy-scan → publish-npmjs + publish-github → release --notes-file
```

## Contributors

- @MaySalguedo — all changes
- CI: `ci.yml` + `cd.yml` + `scripts/` + `trivy.yaml` + `docker-compose.yml`

---

## Checklist for Release

- [x] `RELEASE_NOTES.md` committed (this file)
- [ ] `git tag v1.3.0 && git push origin v1.3.0` triggers `cd.yml`
- [ ] Verify `npm view @may-salguedo/auth-common version` and `GH Packages @MaySalguedo/auth-common` + `gh release view v1.3.0 --json body` matches this file