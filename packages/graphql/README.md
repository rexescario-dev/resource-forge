# @resource-forge/graphql

GraphQL translation for Resource Forge ([RFC-032](../../docs/superpowers/specs/2026-08-10-rfc-032-graphql-schema-resolver-generation-design.md)).

## Purpose

Translate validated core `Resource` values into a GraphQL schema and paired resolver-binding contracts—without putting GraphQL concerns into `@resource-forge/core`, and without requiring Nest or Prisma.

## Usage

```ts
import { translateResources } from '@resource-forge/graphql';

const result = translateResources([customer, order]);
if (!result.ok) {
  // fail-closed: no successful schema/bindings pair
  throw result.error;
}

const { schema, resolverBindings } = result.value;
// Host wires OperationHandlerProvider on GraphQL context and satisfies
// Field/Relation bindings from a host-owned Resource instance surface.
```

Public entry: `translateResources(resources) → Result<{ schema, resolverBindings }, GraphqlTranslationError>`.

Every successful translation also passes GraphQL.js `validateSchema(schema)` with zero errors.

## Structural authority

- Schema members come from core `Resource.identity` + `Resource.schema` (Fields, Relations, Operations).
- Projected metadata / annotations are **inert** for M4.2 structure (no metadata→GraphQL vocabulary).
- Operations with `kind: "query"` map to Query root fields; `kind: "command"` to Mutation (Mutation omitted when there are no commands).
- Query-root closure: the unit MUST include ≥1 mappable `query` Operation or translation fails.
- `void` command results use GraphQL-owned `RfVoid { ok: Boolean! }` → `{ ok: true }` on success.

## Naming

| Source | GraphQL |
| --- | --- |
| ResourceIdentity | `capitalizeFirst(namespace) + name` (e.g. `crm`/`Customer` → `CrmCustomer`) |
| Field / Relation / param | Identity-preserving |
| Root field | `decapitalizeFirst(typeName) + '_' + operationName` |

Naming functions are **not** assumed injective; post-map collisions fail closed. Illegal / reserved type names (`Query`, scalars, `RfVoid`, `__*`, …) fail closed.

## Resolver contracts

Successful `resolverBindings` always include:

- **fields** — per Resource → FieldBinding (`valueSource`, `optional`/`nullable`, `absentBehavior`)
- **relations** — RelationBinding (target type names, multiplicity, host-supplied association / RFC-029 not-loaded classification)
- **operations** — OperationBinding whose `invoke` calls core **`invokeOperation`** only (missing handler = resolve-time failure)

Helpers `createFieldResolver` / `createRelationResolver` / `createOperationResolver` are thin adapters. Default GraphQL field resolution MAY satisfy a FieldBinding when the parent already carries values **and** absentBehavior still holds.

**Host surface convention:** `valueSource` describes the semantic source; M4.2 does not define a universal Resource-instance object protocol. Supply `OperationHandlerProvider` via GraphQL context (`operationHandlerProvider`).

## Fail-closed summary

Translation fails (no success pair) when, among other RFC-032 §8 cases:

- empty unit; invalid Resource; zero-field object type; Field∩Relation name collision
- missing Relation target; no mappable `query` Operations
- illegal/reserved type or member names; type or root-field collisions
- GraphQL.js `validateSchema` errors after construction

## Dependency rules

- May depend on `@resource-forge/core` and `graphql` (GraphQL.js)
- Must **not** depend on `@resource-forge/nest` or `@resource-forge/prisma`
- Nest↔GraphQL server composition and Prisma realization are out of scope for M4.2

## Status

M4.2 product surface implemented per Accepted RFC-032 / Accepted implementation plan ([#109](https://github.com/rexescario-dev/resource-forge/issues/109)).
