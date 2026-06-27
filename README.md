<div align="center">

# @may-salguedo/auth-common

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

`@may-salguedo/auth-common` solves a common problem in NestJS microservice architectures: every service needs JWT auth, but implementing guards, strategies, and per-route overrides from scratch in each service leads to drift and duplicated code.

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
| `pnpm audit` | Check for high/critical vulnerabilities. |

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

You can simulate the exact CI/CD pipeline on your local machine using `act`. The repository already contains event files under .github/events/:

- `push-develop.json` -- used to simulate a push to develop
- `push-main.json` -- used to simulate a push to main (including the publish job)
- `pull-request-develop.json` -- used to simulate a PR against develop
- `pull-request-main.json` -- used to simulate a PR against main

Install `act`

```bash
act -l
```

To run the CI workflow for a develop branch push:

```bash
act push -e .github/events/push-develop.json
```

For a PR event:

```bash
act pull_request -e .github/events/pull-request-develop.json
```

The `push-main.json` event file triggers the publish job as well (it requires a valid npm token). The token is read from the `.secrets` file located at the repository root.

Example .secrets file content:

```env
NPM_TOKEN=npm_your_actual_token_here
```

> `act` uses Docker containers internally, so ensure Docker is installed and running. The provided event files match your GitHub Actions workflows (ci.yml, cd.yml) exactly.

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

## License

This project is licensed under the **Eclipse Public License 2.0 (EPL-2.0)**.
You may obtain a copy of the License at

[https://www.eclipse.org/legal/epl-2.0/](https://www.eclipse.org/legal/epl-2.0/)

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

---

  Made with ❤️ by <strong>MaySalguedo</strong>
</div>
