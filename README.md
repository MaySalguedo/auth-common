<div align="center">

# @neoatalaya/auth-common

[![NestJS](https://img.shields.io/badge/NestJS-^10.0_||_^11.0-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-^5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Passport](https://img.shields.io/badge/Passport--JWT-4.0-34E27A?style=for-the-badge&logo=passport&logoColor=white)](http://www.passportjs.org)
[![License: EPL-2.0](https://img.shields.io/badge/License-EPL--2.0-yellow?style=for-the-badge)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0-blue?style=for-the-badge)]()

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
- [Custom Payload Validation](#custom-payload-validation)
- [Custom Guards](#custom-guards)
- [Interfaces & Types](#interfaces--types)
- [Exceptions](#exceptions)
- [Token Reference](#token-reference)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

`@neoatalaya/auth-common` solves a common problem in NestJS microservice architectures: every service needs JWT auth, but implementing guards, strategies, and per-route overrides from scratch in each service leads to drift and duplicated code.

This library provides a single `AuthCommonModule.forRoot()` call that:

- Registers a `JwtStrategy` backed by `passport-jwt`.
- Provides a `JwtGuard` extending NestJS's `AuthGuard('jwt')`.
- Wires an **`OrchestratorGuard`** — a smart global guard that reads route metadata and delegates to the correct named guard at runtime.
- Exposes clean decorators (`@PublicGuard()`, `@UseGuards()`) for per-route control.

---

## Features

- 🔐 **JWT out of the box** — strategy + guard configured from a single secret.
- 🎯 **Guard orchestration** — one global guard, multiple named strategies resolved per route via metadata.
- 🌐 **Public route bypass** — mark any endpoint with `@PublicGuard()` to skip auth entirely.
- 🔌 **Extensible** — register any number of custom guards (`api-key`, `roles`, `subscription`) alongside JWT.
- 🧩 **Custom payload validation** — inject your own `validate()` function to enrich or reject the decoded token payload.
- 📦 **Minimal peer dependencies** — only requires the standard NestJS core packages.

---

## Installation

```bash
npm install @neoatalaya/auth-common
```

### Peer Dependencies

Make sure the following packages are present in your project:

```bash
npm install @nestjs/common @nestjs/core reflect-metadata rxjs
```

---

## Quick Start

Import `AuthCommonModule` in your root `AppModule` using `forRoot()`:

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthCommonModule, OrchestratorGuard } from '@neoatalaya/auth-common';

@Module({
  imports: [
    AuthCommonModule.forRoot({
      jwtSecret: process.env.JWT_SECRET,
    }),
  ],
  providers: [
    // Apply OrchestratorGuard globally — it handles public routes and per-route overrides automatically
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
import { JwtGuard } from '@neoatalaya/auth-common';

@Controller('protected')
@UseGuards(JwtGuard) // NestJS native UseGuards — bypasses the orchestrator
export class ProtectedController {}
```

---

## Decorators

### `@PublicGuard()`

Marks a route or an entire controller as **publicly accessible**, bypassing the `OrchestratorGuard` entirely.

```typescript
import { Controller, Get } from '@nestjs/common';
import { PublicGuard } from '@neoatalaya/auth-common';

@Controller('auth')
export class AuthController {

  @PublicGuard()
  @Get('login')
  login() {
    // No JWT required
  }

  @Get('me')
  getProfile() {
    // JWT required (falls back to defaultGuard)
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

> ⚠️ This is **not** NestJS's built-in `@UseGuards()`. Import it from `@neoatalaya/auth-common` to work with the orchestrator.

Specifies which named guard(s) the `OrchestratorGuard` should execute for a given route. Guards are executed **sequentially** — all must pass for the request to proceed.

```typescript
import { Controller, Get } from '@nestjs/common';
import { UseGuards } from '@neoatalaya/auth-common';

@Controller('admin')
export class AdminController {

  @UseGuards('jwt', 'roles')
  @Get('dashboard')
  getDashboard() {
    // Both 'jwt' and 'roles' guards must pass
  }

  @UseGuards('api-key')
  @Get('webhook')
  handleWebhook() {
    // Only the 'api-key' guard is executed
  }
}
```

Named keys must match the keys provided in the `guards` option of `forRoot()`.

---

## Custom Payload Validation

By default, `JwtStrategy` returns the decoded JWT payload as-is. Provide a `validate` function to enrich the payload (e.g. fetch the user from a database) or reject it by throwing an exception.

```typescript
// app.module.ts
import { AuthCommonModule } from '@neoatalaya/auth-common';
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
    'api-key': ApiKeyGuard,          // pass class — module instantiates it
    'custom':  new SomeGuardInstance(), // or pass an already-created instance
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
  iat: number; // Issued at (Unix timestamp)
  exp: number; // Expiration (Unix timestamp)
}
```

Your custom payload type is always intersected with `TokenIssues` when received by `validate()`.

---

## Exceptions

### `FailedDependencyException`

An `HttpException` that produces a **`424 Failed Dependency`** response. Useful inside `validate()` when the auth failure is caused by a downstream dependency (e.g. user service unavailable) rather than an invalid token.

```typescript
import { FailedDependencyException } from '@neoatalaya/auth-common';

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

```typescript
import { Inject } from '@nestjs/common';
import { GUARD_REGISTRY } from '@neoatalaya/auth-common';

@Injectable()
export class MyService {
  constructor(
    @Inject(GUARD_REGISTRY) private registry: Record<string, CanActivate>
  ) {}
}
```

---

### Development Scripts

```bash
# Run unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:cov

# Build the library
npm run build

# Build and pack (generates .tgz for local testing)
npm run compile

# Lint and auto-fix
npm run lint

# Format source files
npm run format
```

<div align="center">

---
## 📄 License

This project is licensed under the **Eclipse Public License 2.0 (EPL-2.0)**.  
You may obtain a copy of the License at  

[https://www.eclipse.org/legal/epl-2.0/](https://www.eclipse.org/legal/epl-2.0/)  

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

---

  Made with ❤️ by <strong>NeoAtalaya</strong>
</div>