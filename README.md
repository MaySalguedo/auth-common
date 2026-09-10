<div align="center">

# @may-salguedo/auth-common

[![NestJS](https://img.shields.io/badge/NestJS-^10.0_||_^11.0-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-^5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Passport](https://img.shields.io/badge/Passport--JWT-4.0-34E27A?style=for-the-badge&logo=passport&logoColor=white)](http://www.passportjs.org)
[![License: EPL-2.0](https://img.shields.io/badge/License-EPL--2.0-yellow?style=for-the-badge)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.2.0-blue?style=for-the-badge)]()

Plug-and-play JWT authentication infrastructure for **NestJS microservices**. One module registration wires up guards, strategies, and a runtime guard orchestrator — so your services share a consistent auth layer without repeating boilerplate.

</div>

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Module Configuration](#module-configuration)
  - [`AuthCommonOptions`](#authcommonoptions)
- [Guards](#guards)
  - [`OrchestratorGuard`](#orchestratorguard)
  - [`JwtGuard`](#jwtguard)
- [Decorators](#decorators)
  - [`@PublicGuard()`](#publicguard)
  - [`@UseGuards()`](#useguards)
  - [`@RequireAttribute()`](#requireattribute)
  - [`@AuthUser()`](#authuser)
  - [`@HasAttribute()`](#hasattribute)
  - [`@Headers()`](#headers)
  - [`@Session()`](#session)
- [Custom Payload Validation](#custom-payload-validation)
- [Custom Guards](#custom-guards)
- [Interfaces & Types](#interfaces--types)
- [Exceptions](#exceptions)
- [Token Reference](#token-reference)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

`@may-salguedo/auth-common` solves a common problem in NestJS microservice architectures: every service needs JWT auth, but implementing guards, strategies, and per-route overrides from scratch in each service leads to drift and duplicated code.

This library provides a single `AuthCommonModule.forRoot()` call that:

- Registers a `JwtStrategy` backed by `passport-jwt`.
- Provides a `JwtGuard` extending NestJS's `AuthGuard('jwt')`.
- Wires an **`OrchestratorGuard`** — a smart global guard that reads route metadata and delegates to the correct named guard at runtime.
- Exposes clean decorators (`@PublicGuard()`, `@UseGuards()`, `@RequireAttribute()`, `@AuthUser()`, `@HasAttribute()`, `@Headers()`, `@Session()`) for per-route control.

---

## Features

- 🔐 **JWT out of the box** — strategy + guard configured from a single secret.
- 🎯 **Guard orchestration** — one global guard, multiple named strategies resolved per route via metadata.
- 🌐 **Public route bypass** — mark any endpoint with `@PublicGuard()` to skip auth entirely.
- 🔌 **Extensible** — register any number of custom guards (`api-key`, `roles`, `subscription`) alongside JWT.
- 🧩 **Custom payload validation** — inject your own `validate()` function to enrich or reject the decoded token payload.
- ✅ **Attribute validation** — declaratively require JWT payload attributes (nested + array-aware) via `@RequireAttribute()` enforced in `JwtGuard`.
- 👤 **Typed user injection** — read `request.user` directly as a handler parameter with full generic type safety via `@AuthUser()`.
- ✋ **Handler-level attribute checks** — branch on JWT payload attributes with the same nested + array semantics via `@HasAttribute()`.
- 📋 **Header extraction** — access HTTP headers with case-insensitive matching and pipe support via `@Headers()`.
- 🗄️ **Session access** — read session properties or the full session object with pipe support via `@Session()`.
- 📦 **Minimal peer dependencies** — only requires the standard NestJS core packages.

---

## Installation

```bash
pnpm add @may-salguedo/auth-common
```

### Peer Dependencies

Make sure the following packages are present in your project:

```bash
pnpm add @nestjs/common @nestjs/core reflect-metadata rxjs
```

---

## Quick Start

Import `AuthCommonModule` in your root `AppModule` using `forRoot()`:

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthCommonModule, OrchestratorGuard } from '@may-salguedo/auth-common';

@Module({
  imports: [
    AuthCommonModule.forRoot({
      jwtSecret: process.env.JWT_SECRET,
    }),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: OrchestratorGuard,
    },
  ],
})
export class AppModule {}
```

That's it. Every route is now JWT-protected by default. Use the [decorators](#decorators) below to opt individual routes in or out.

---

## Module Configuration

### `AuthCommonModule.forRoot(options)`

Returns a `DynamicModule` that configures and exports the entire auth infrastructure.

```typescript
AuthCommonModule.forRoot<T>(options: AuthCommonOptions<T>): DynamicModule
```

| Parameter | Type                  | Required | Description                              |
| --------- | --------------------- | -------- | ---------------------------------------- |
| `options` | `AuthCommonOptions<T>` | ✅        | Configuration object — see table below. |

---

### `AuthCommonOptions`

```typescript
export interface AuthCommonOptions<T = any> {
  jwtSecret: string;
  defaultGuard?: string;
  guards?: Record<string, Type<CanActivate> | CanActivate>;
  validate?: (payload: T & TokenIssues) => (T & TokenIssues) | Promise<T & TokenIssues>;
}
```

| Property       | Type                                            | Default   | Description                                                                                                    |
| -------------- | ----------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------- |
| `jwtSecret`    | `string`                                        | —         | **Required.** Secret used to verify incoming JWT tokens.                                                       |
| `defaultGuard` | `string`                                        | `'jwt'`   | Key of the guard the `OrchestratorGuard` falls back to when no `@UseGuards()` metadata is present on a route. |
| `guards`       | `Record<string, Type<CanActivate> \| CanActivate>` | `{}`      | Named custom guards to register alongside JWT. See [Custom Guards](#custom-guards).                            |
| `validate`     | `(payload: T & TokenIssues) => T & TokenIssues` | `identity`| Optional function to enrich or validate the decoded token payload. See [Custom Payload Validation](#custom-payload-validation). |

---

## Guards

### `OrchestratorGuard`

The central piece of the library. Designed to be registered as a **global guard** via `APP_GUARD`, it intercepts every request and decides which guard(s) to execute based on route metadata:

| Condition | Behaviour |
| --------- | --------- |
| Route is decorated with `@PublicGuard()` | Passes immediately — no guard is executed. |
| Route is decorated with `@UseGuards('key1', 'key2')` | Executes the named guards sequentially. |
| No decorator is present | Falls back to the `defaultGuard` configured in `forRoot()`. |

```typescript
// main.ts — alternative: apply globally via useGlobalGuards
const app = await NestFactory.create(AppModule);
// If not using APP_GUARD provider, apply manually:
// app.useGlobalGuards(app.get(OrchestratorGuard));
```

> **Note:** Using `APP_GUARD` is preferred because it participates in NestJS's dependency injection, allowing the guard to have its own injected services.

---

### `JwtGuard`

A standard Passport-backed JWT guard. It is automatically registered by `AuthCommonModule` and is available under the `'jwt'` key in the guard registry.

You can also inject and use it directly:

```typescript
import { UseGuards } from '@nestjs/common';
import { JwtGuard } from '@may-salguedo/auth-common';

@Controller('protected')
@UseGuards(JwtGuard)
export class ProtectedController {}
```

---

## Decorators

### `@PublicGuard()`

Marks a route or an entire controller as **publicly accessible**, bypassing the `OrchestratorGuard` entirely.

```typescript
import { Controller, Get } from '@nestjs/common';
import { PublicGuard } from '@may-salguedo/auth-common';

@Controller('auth')
export class AuthController {

  @PublicGuard()
  @Get('login')
  login() {
  }

  @Get('me')
  getProfile() {
  }
}
```

Can also be applied at **controller level** to make all routes public:

```typescript
@PublicGuard()
@Controller('public')
export class PublicController {}
```

---

### `@UseGuards()`

> ⚠️ This is **not** NestJS's built-in `@UseGuards()`. Import it from `@may-salguedo/auth-common` to work with the orchestrator.

Specifies which named guard(s) the `OrchestratorGuard` should execute for a given route. Guards are executed **sequentially** — all must pass for the request to proceed.

```typescript
import { Controller, Get } from '@nestjs/common';
import { UseGuards } from '@may-salguedo/auth-common';

@Controller('admin')
export class AdminController {

  @UseGuards('jwt', 'roles')
  @Get('dashboard')
  getDashboard() {
  }

  @UseGuards('api-key')
  @Get('webhook')
  handleWebhook() {
  }
}
```

Named keys must match the keys provided in the `guards` option of `forRoot()`.

---

### `@RequireAttribute()`

Declaratively require that the verified JWT payload (`request.user` from `JwtStrategy`) contains a specific attribute. Validation runs **inside `JwtGuard` after token verification** — no extra guard registration, no handler-level `if` checks.

```typescript
import { Controller, Get } from '@nestjs/common';
import { RequireAttribute } from '@may-salguedo/auth-common';

@Controller('reports')
export class ReportsController {
  // scalar top-level: payload { role: 'admin' }
  @RequireAttribute('role', 'admin')
  @Get('admin')
  getAdmin() {}

  // nested dot-path: payload { organization: { plan: 'pro' } }
  @RequireAttribute('organization.plan', 'pro')
  @Get('billing')
  getBilling() {}

  // array payload + scalar expected: payload { roles: ['admin','editor'] }
  @RequireAttribute('roles', 'admin')
  @Get('editor')
  getEditor() {}

  // array expected requires EVERY value: payload { permissions: ['read','write'] }
  @RequireAttribute('permissions', ['read', 'write'])
  @Get('write')
  getWrite() {}

  // nested + array flattening: payload { orgs: [{role:'viewer'}, {role:'admin'}] }
  @RequireAttribute('orgs.role', 'admin')
  @Get('org-admin')
  getOrgAdmin() {}
}
```

**Behavior:**

| Payload shape | Decorator | Result |
|---|---|---|
| `{ roles: ['admin','editor'] }` | `@RequireAttribute('roles','admin')` | ✅ pass (`includes`) |
| `{ roles: ['editor'] }` | `@RequireAttribute('roles','admin')` | ❌ `403 Forbidden` |
| `{ permissions: ['read','write','delete'] }` | `@RequireAttribute('permissions',['read','write'])` | ✅ pass (`EVERY`) |
| `{ permissions: ['read'] }` | `@RequireAttribute('permissions',['read','write'])` | ❌ `403` (not all present) |
| `{ orgs: [{role:'admin'}] }` | `@RequireAttribute('orgs.role','admin')` | ✅ pass (flattened `orgs[*].role`) |
| `{}` or `{ organization: null }` | `@RequireAttribute('organization.plan','pro')` | ❌ `403` — no crash, message includes path |

**Composition:**

* Stack multiple decorators — they are **AND**-composed (all must pass, order independent):
  ```typescript
  @RequireAttribute('roles', 'admin')
  @RequireAttribute('tenant', 'acme')
  @Get('dashboard')
  getDashboard() {} // requires both
  ```
* Works at **handler or controller level** — controller-level applies to all routes.
* `@PublicGuard()` still bypasses (`OrchestratorGuard` checks `IS_PUBLIC_KEY` first) — no attribute evaluation.

**Errors:**
Failures throw `ForbiddenException` (`403`) with deterministic message:
```
Attribute 'organization.plan' expected "pro" but got undefined
Attribute 'roles' expected "admin" but got ["editor"]
```

**Scope limits (v1):**
* Strict equality (`===`) + array semantics only — no regex/comparator injection.
* No OR combinators — use separate routes or a custom guard for complex logic.
* Validation only — no payload mutation (use `validate` option for enrichment).

---

### `@AuthUser()`

Injects `request.user` directly as a handler parameter with an explicit generic — no `@Req()` / `@Request()` import, no manual cast. The generic covers both supported shapes: an object payload (typically `T & TokenIssues`) and a raw JWT `string`.

```typescript
import { Controller, Get } from '@nestjs/common';
import { AuthUser, TokenIssues } from '@may-salguedo/auth-common';

interface MyPayload {
  sub: string;
  role: string;
}

@Controller('users')
export class UsersController {
  // object payload: { sub: '123', role: 'admin', iat: 1, exp: 2 }
  @Get('me')
  getMe(@AuthUser<MyPayload>() user: MyPayload & TokenIssues) {
    return user;
  }

  // raw JWT string
  @Get('token')
  getToken(@AuthUser<string>() token: string) {
    return token;
  }
}
```

**Behavior:**

| `req.user` shape | Decorator | Result |
|---|---|---|
| `{ sub: '123', role: 'admin', iat: 1, exp: 2 }` | `@AuthUser<MyPayload>()` | ✅ param strictly equals `req.user` |
| `'eyJhbGciOi...'` (JWT string) | `@AuthUser<string>()` | ✅ param strictly equals the string |
| missing (e.g. `@PublicGuard()` route) | `@AuthUser<MyPayload>()` | ✅ `undefined` — no throw |

**Scope limits (v1):**
* Whole user only — no property-path picking (e.g. `@AuthUser('sub')`).
* No validation or transformation — guards and the `validate` option stay authoritative.
* Missing user resolves to `undefined` — the handler or guard decides what to do.

---

### `@HasAttribute()`

Injects a `boolean` handler parameter answering whether the verified JWT payload (`request.user` from `JwtStrategy`) contains a given attribute value — same nested + array semantics as `@RequireAttribute()`, but for branching instead of `403` enforcement. No `@Req()` / `@Request()` import, no manual path resolution, never throws.

```typescript
import { Controller, Get } from '@nestjs/common';
import { HasAttribute } from '@may-salguedo/auth-common';

@Controller('dashboard')
export class DashboardController {
  // scalar top-level: payload { role: 'admin' }
  @Get('admin')
  getAdmin(@HasAttribute('role', 'admin') isAdmin: boolean) {
    return isAdmin ? 'full' : 'limited';
  }

  // nested dot-path: payload { organization: { plan: 'pro' } }
  @Get('billing')
  getBilling(@HasAttribute('organization.plan', 'pro') isPro: boolean) {
    return isPro;
  }

  // array payload + scalar expected: payload { roles: ['admin','editor'] }
  @Get('editor')
  getEditor(@HasAttribute('roles', 'admin') canEdit: boolean) {
    return canEdit;
  }

  // array expected requires EVERY value: payload { permissions: ['read','write'] }
  @Get('write')
  getWrite(
    @HasAttribute('permissions', ['read', 'write']) canWrite: boolean,
  ) {
    return canWrite;
  }

  // nested + array flattening: payload { orgs: [{role:'viewer'}, {role:'admin'}] }
  @Get('org-admin')
  getOrgAdmin(@HasAttribute('orgs.role', 'admin') isOrgAdmin: boolean) {
    return isOrgAdmin;
  }
}
```

**Behavior:**

| Payload shape | Decorator | Result |
|---|---|---|
| `{ roles: ['admin','editor'] }` | `@HasAttribute('roles','admin')` | ✅ `true` (`includes`) |
| `{ roles: ['editor'] }` | `@HasAttribute('roles','admin')` | ❌ `false` |
| `{ permissions: ['read','write','delete'] }` | `@HasAttribute('permissions',['read','write'])` | ✅ `true` (`EVERY`) |
| `{ permissions: ['read'] }` | `@HasAttribute('permissions',['read','write'])` | ❌ `false` (not all present) |
| `{ orgs: [{role:'admin'}] }` | `@HasAttribute('orgs.role','admin')` | ✅ `true` (flattened `orgs[*].role`) |
| `{}` or `{ organization: null }` | `@HasAttribute('organization.plan','pro')` | ❌ `false` — no crash |
| missing (e.g. `@PublicGuard()` route) | `@HasAttribute('roles','admin')` | ❌ `false` — no throw |

**Composition:**

* Works after `JwtGuard`, any custom registry guard, and on public routes.
* Multiple parameters compose via handler logic — no metadata stacking:
  ```typescript
  @Get('dashboard')
  getDashboard(
    @HasAttribute('roles', 'admin') isAdmin: boolean,
    @HasAttribute('tenant', 'acme') isAcme: boolean,
  ) {
    return isAdmin && isAcme;
  }
  ```
* For enforcement use `@RequireAttribute()`; for the whole user use `@AuthUser()`.

**Scope limits (v1):**
* Boolean only — no raw value extraction.
* No enforcement / throwing — `@RequireAttribute()` + `JwtGuard` stay authoritative for `403`.
* Strict equality (`===`) + array semantics only — no regex/comparator injection.
* No OR combinators — combine booleans in the handler.

---

### `@Headers()`

Extracts HTTP request headers with **case-insensitive matching** (matching Express behavior) and full **NestJS pipe support** for type transformation. Returns a specific header value, all headers as an object, or `undefined` when the header/request is missing.

```typescript
import { Controller, Get } from '@nestjs/common';
import { Headers } from '@may-salguedo/auth-common';
import { ParseUUIDPipe, ParseIntPipe } from '@nestjs/common';

@Controller('requests')
export class RequestsController {
  // Single header: GET /requests/x-request-id
  @Get('x-request-id')
  getRequestId(@Headers('x-request-id') requestId: string) {
    return requestId;
  }

  // All headers as object: GET /requests/headers
  @Get('headers')
  getAllHeaders(@Headers() headers: Record<string, string>) {
    return headers;
  }

  // With pipe for type transformation: GET /requests/x-tenant-id
  @Get('x-tenant-id')
  getTenantId(@Headers('x-tenant-id', ParseUUIDPipe) tenantId: string) {
    return tenantId;
  }

  // Custom header with numeric pipe: GET /requests/x-rate-limit
  @Get('x-rate-limit')
  getRateLimit(@Headers('x-rate-limit', ParseIntPipe) limit: number) {
    return limit;
  }
}
```

**Behavior:**

| Request headers | Decorator | Result |
|---|---|---|
| `x-request-id: abc123` | `@Headers('x-request-id')` | `'abc123'` |
| `X-Request-ID: abc123` | `@Headers('x-request-id')` | `'abc123'` (case-insensitive) |
| `x-request-id: abc123` | `@Headers('X-REQUEST-ID')` | `'abc123'` (case-insensitive) |
| Missing header | `@Headers('x-request-id')` | `undefined` |
| `{ 'x-a': '1', 'x-b': '2' }` | `@Headers()` | `{ 'x-a': '1', 'x-b': '2' }` |
| Missing request | `@Headers('x-request-id')` | `undefined` |

**Composition:**

* Works on any route — public, JWT-protected, or custom guard-protected.
* Combine with pipes for automatic type coercion and validation:
  ```typescript
  @Get('webhook')
  handleWebhook(
    @Headers('x-signature') signature: string,
    @Headers('x-timestamp', ParseIntPipe) timestamp: number,
  ) {}
  ```
* Returns normalized headers (lowercase keys) when called without argument.

**Scope limits (v1):**
* Header values only — no multi-value header support (returns first value).
* No header prefix filtering — exact or case-insensitive key match only.
* Relies on Express `req.headers` — behavior matches underlying platform.

---

### `@Session()`

Extracts the **session object** from the request (requires session middleware like `express-session`) with full **NestJS pipe support**. Returns a specific session property, the entire session object, or `undefined` when session/request is missing.

```typescript
import { Controller, Get } from '@nestjs/common';
import { Session } from '@may-salguedo/auth-common';
import { ParseIntPipe } from '@nestjs/common';

@Controller('session')
export class SessionController {
  // Single session property: GET /session/user-id
  @Get('user-id')
  getUserId(@Session('userId') userId: string) {
    return userId;
  }

  // All session data: GET /session/all
  @Get('all')
  getAllSession(@Session() session: Record<string, unknown>) {
    return session;
  }

  // With pipe for type transformation: GET /session/visit-count
  @Get('visit-count')
  getVisitCount(@Session('visitCount', ParseIntPipe) count: number) {
    return count;
  }

  // Nested object property (returns nested object): GET /session/user
  @Get('user')
  getUser(@Session('user') user: { id: string; name: string }) {
    return user;
  }
}
```

**Behavior:**

| Session data | Decorator | Result |
|---|---|---|
| `{ userId: '123', visitCount: 5 }` | `@Session('userId')` | `'123'` |
| `{ userId: '123', visitCount: 5 }` | `@Session('visitCount', ParseIntPipe)` | `5` (number) |
| `{ user: { id: '123', name: 'John' } }` | `@Session('user')` | `{ id: '123', name: 'John' }` |
| `{ userId: '123' }` | `@Session('missing')` | `undefined` |
| `{}` | `@Session()` | `{}` |
| Missing session | `@Session('userId')` | `undefined` |
| Missing request | `@Session('userId')` | `undefined` |

**Composition:**

* Works on any route — public, JWT-protected, or custom guard-protected.
* Combine with pipes for automatic type coercion:
  ```typescript
  @Get('profile')
  getProfile(
    @Session('userId', ParseUUIDPipe) userId: string,
    @Session('preferences') prefs: Record<string, unknown>,
  ) {}
  ```
* Returns `undefined` gracefully on public routes (no session) — no throw.

**Scope limits (v1):**
* Requires session middleware (e.g. `express-session`) — no session = `undefined`.
* No deep path picking — `@Session('user.id')` returns `undefined` (use `@Session('user')` then destructure).
* Relies on Express `req.session` — behavior matches underlying platform.

---

## Custom Payload Validation

By default, `JwtStrategy` returns the decoded JWT payload as-is. Provide a `validate` function to enrich the payload (e.g. fetch the user from a database) or reject it by throwing an exception.

```typescript
// app.module.ts
import { AuthCommonModule } from '@may-salguedo/auth-common';
import { UnauthorizedException } from '@nestjs/common';

interface MyPayload {
  sub: string;
  email: string;
}

AuthCommonModule.forRoot<MyPayload>({
  jwtSecret: process.env.JWT_SECRET,
  validate: async (payload) => {
    const user = await userRepository.findOne(payload.sub);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return { ...payload, roles: user.roles };
  },
});
```

The return value of `validate()` becomes the value attached to `request.user` in your controllers.

---

## Custom Guards

Register any additional guard under a named key to make it available to `@UseGuards()` and `OrchestratorGuard`:

```typescript
// api-key.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    return request.headers['x-api-key'] === process.env.API_KEY;
  }
}
```

```typescript
// app.module.ts
AuthCommonModule.forRoot({
  jwtSecret: process.env.JWT_SECRET,
  defaultGuard: 'jwt',
  guards: {
    'api-key': ApiKeyGuard,
    'custom':  new SomeGuardInstance(),
  },
});
```

```typescript
// any controller
@UseGuards('api-key')
@Post('ingest')
handleIngestion() {}
```

---

## Interfaces & Types

### `AuthCommonOptions<T>`

Configuration interface for `forRoot()`. See [Module Configuration](#module-configuration).

---

### `TokenIssues`

Standard JWT claims automatically merged into every decoded payload:

```typescript
export interface TokenIssues {
  iat: number;
  exp: number;
}
```

Your custom payload type is always intersected with `TokenIssues` when received by `validate()`.

---

## Exceptions

### `FailedDependencyException`

An `HttpException` that produces a **`424 Failed Dependency`** response. Useful inside `validate()` when the auth failure is caused by a downstream dependency (e.g. user service unavailable) rather than an invalid token.

```typescript
import { FailedDependencyException } from '@may-salguedo/auth-common';

validate: async (payload) => {
  const user = await userService.find(payload.sub).catch(() => {
    throw new FailedDependencyException('User service unreachable');
  });

  return { ...payload, ...user };
}
```

| Constructor | Default message |
| --- | --- |
| `new FailedDependencyException()` | `'Failed Dependency'` |
| `new FailedDependencyException('Custom message')` | `'Custom message'` |

---

## Token Reference

The following DI injection tokens are exported for advanced scenarios where you need to inject library internals into your own providers:

| Token | Type | Description |
| ----- | ---- | ----------- |
| `JWT_SECRET` | `string` | The secret passed to `forRoot()`. |
| `DEFAULT_GUARD` | `string` | The `defaultGuard` key passed to `forRoot()`. |
| `GUARD_REGISTRY` | `Record<string, CanActivate>` | Map of all registered named guards, including `'jwt'`. |
| `IS_PUBLIC_KEY` | `string` | Metadata key used by `@PublicGuard()`. |
| `USE_GUARDS_KEY` | `string` | Metadata key used by `@UseGuards()`. |
| `REQUIRE_ATTRIBUTE_KEY` | `string` | Metadata key used by `@RequireAttribute()`. |

```typescript
import { Inject } from '@nestjs/common';
import { GUARD_REGISTRY } from '@may-salguedo/auth-common';

@Injectable()
export class MyService {
  constructor(
    @Inject(GUARD_REGISTRY) private registry: Record<string, CanActivate>
  ) {}
}
```

---

### Development Scripts

| Command | Description |
|---------|-------------|
| `pnpm test` | Run unit tests once. |
| `pnpm test:watch` | Run tests in watch mode (auto-rerun on changes). |
| `pnpm test:cov` | Run tests with coverage report (fails if coverage < 90%). |
| `pnpm build` | Compile TypeScript to `dist/` using NestJS builder. |
| `pnpm pack` | Create a `.tgz` archive of the package (dry-run for publishing). |
| `pnpm output` | Print absolute path of the generated `.tgz` file (used after `pack`). |
| `pnpm compile` | **Full local build pipeline:** `build` `pack` `output`. |
| `pnpm lint` | Run ESLint and auto-fix issues. |
| `pnpm lint:no-spec` | Run ESLint excluding spec files. |
| `pnpm format` | Format code with Prettier. |
| `pnpm check` | TypeScript type-check without emitting files. |
| `pnpm audit` | Check for vulnerabilities (fails on any severity). |
| `pnpm audit:trivy` | Run Trivy filesystem scan (vulns, misconfigs, licenses). |

#### Docker (containerized tests)

The repository includes a multi-stage `Dockerfile` under `.github/docker/` and a `docker-compose.yml` at the root to run every job inside a consistent Node.js environment.

```bash
docker compose build test
docker compose run --rm test
docker compose run --rm test pnpm test -- src/common/tokens.spec.ts
```

The same compose file supports all CI jobs:

```bash
docker compose build audit
docker compose run --rm audit

docker compose build linter
docker compose run --rm linter

docker compose build check
docker compose run --rm check

docker compose build build
docker compose run --rm build
```

Coverage reports are written at `./coverage/lcov-report/index.html` when using the provided compose setup.

### Testing GitHub Actions locally with `act`

You can simulate the CI/CD pipeline on your local machine using `act`. The repository includes event files under `.github/events/`:

| Event file | Triggers | Workflow |
|---|---|---|
| `push-develop.json` | Push to `develop` | CI |
| `push-main.json` | Push to `main` | CI |
| `push-tag.json` | Push tag `v*` | CD |
| `pull-request-develop.json` | PR against `develop` | CI |
| `pull-request-main.json` | PR against `main` | CI |
| `workflow-dispatch.json` | Manual dispatch | CI / CD |

Install `act` and list available jobs:

```bash
act -l
```

#### Testing CI

```bash
# Push to develop
act -W .github/workflows/ci.yml -e .github/events/push-develop.json

# PR against develop
act -W .github/workflows/ci.yml -e .github/events/pull-request-develop.json
```

#### Testing CD (up to Trivy scan)

```bash
act -W .github/workflows/cd.yml -e .github/events/push-tag.json \
  -j trivy-scan --artifact-server-path /tmp/act-artifacts \
  --secret-file .secrets
```

The `--artifact-server-path` flag is required for the artifact upload/download actions to work locally. Using `-j trivy-scan` runs the full dependency chain (`wait-for-ci` → `setup` → `trivy-scan`).

> The `wait-for-ci` job is automatically skipped when running in `act` (it detects the `ACT=true` environment variable) since there is no real CI workflow run to check. On GitHub, it polls the CI workflow for the same commit and blocks CD until CI succeeds.

#### Testing CD (full pipeline)

To test the publish and release jobs locally, add the required tokens to `.secrets`:

```env
GITHUB_TOKEN=ghp_your_github_token_here
NPM_TOKEN=npm_your_npm_token_here
```

Then run:

```bash
act -W .github/workflows/cd.yml -e .github/events/push-tag.json \
  --artifact-server-path /tmp/act-artifacts \
  --secret-file .secrets
```

> The `GITHUB_TOKEN` requires `public_repo` scope for `act` to clone action repos and populate `github.token`. For the full CD pipeline locally, the PAT also needs `write:packages` (GitHub Packages) — `contents: write` is included in `public_repo` for public repos, and `permissions` set in each CD job apply only on GitHub.

> `act` uses Docker containers internally, so ensure Docker is installed and running. The provided event files match your GitHub Actions workflows (`ci.yml`, `cd.yml`) exactly.

### Local compilation & packaging

The `compile` script is the recommended one-shot build command:

```bash
pnpm compile
```

Creates a `.tgz` archive and prints its absolute path -- perfect for CI or for local installation in another project:

```bash
pnpm install /absolute/path/to/may-salguedo-auth-common-#.#.#.tgz
```

<div align="center">

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full workflow: setup, branches, commits, checks, pull requests, and releases.

Please read our [Code of Conduct](./CODE_OF_CONDUCT.md) — by participating you agree to abide by it.

---

## License

This project is licensed under the **Eclipse Public License 2.0 (EPL-2.0)**.
You may obtain a copy of the License at

[https://www.eclipse.org/legal/epl-2.0/](https://www.eclipse.org/legal/epl-2.0/)

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

---

  Made with ❤️ by <strong>MaySalguedo</strong>
</div>
