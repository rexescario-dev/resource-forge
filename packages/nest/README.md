# @resource-forge/nest

NestJS **discovery-first host** for Resource Forge ([RFC-031](../../docs/superpowers/specs/2026-08-10-rfc-031-nest-discovery-host-integration-design.md)).

## Purpose

Host `@resource-forge/core` inside a Nest application:

1. Discover marked resource declaration providers
2. Resolve exactly one core `Resource` each (`Resource | Promise<Resource>`)
3. `validateResource` → `projectResourceMetadata` → `ResourceRegistry.register`
4. Expose the populated core registry via Nest DI **only after** full success

## Dependency rules

- Depends on `@resource-forge/core`
- Peer: `@nestjs/common`, `@nestjs/core`, `reflect-metadata`
- Must **not** depend on `@resource-forge/graphql` or `@resource-forge/prisma`
- Core does not depend on Nest

## Usage

```ts
import { Injectable, Module } from '@nestjs/common';
import {
  createResource,
  createResourceIdentity,
  type Resource,
  type ResourceRegistry,
} from '@resource-forge/core';
import {
  DiscoverableResource,
  RESOURCE_REGISTRY,
  ResourceForgeModule,
  type ResourceDeclarationProvider,
} from '@resource-forge/nest';

@Injectable()
@DiscoverableResource()
class CustomerResourceProvider implements ResourceDeclarationProvider {
  provideResource(): Resource {
    const identity = createResourceIdentity('crm', 'Customer');
    if (!identity.ok) throw new Error('identity');
    const resource = createResource(identity.value);
    if (!resource.ok) throw new Error('resource');
    return resource.value;
  }
}

@Module({
  imports: [ResourceForgeModule.forRoot()],
  providers: [CustomerResourceProvider],
})
export class AppModule {}

// After successful bootstrap:
// constructor(@Inject(RESOURCE_REGISTRY) registry: ResourceRegistry) {}
```

`forRootAsync` accepts Nest-only options factories. It does **not** accept a shared external registry to mutate during init, and does not configure fetch/load semantics.

## Non-goals (this package / M4.1)

- GraphQL schema/resolvers
- Prisma / ORM realization
- Field/Relation/Operation decorator DSL
- Metadata emitters
- Query/navigation host APIs
