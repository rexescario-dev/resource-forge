# RFC-032: GraphQL Schema & Resolver Generation

**Date:** 2026-08-10  
**Status:** Accepted  
**M3:** Accepted (2026-08-10) — Design Review re-entry; no design blockers after Query-root closure (unit MUST produce ≥1 mappable `query` Operation; zero Resources and Resources-without-query fail closed), naming non-injectivity + post-map collision detection (§5.1.4), built-in/introspection/root/`RfVoid` type reservations, identity-preserving member names, normative `optional`×`nullable` SDL/runtime split including Relation `many` `[Target!]!`/`[Target!]`, canonical `RfVoid`, zero-field Resource fail-closed, inert metadata, paired schema/resolver success, Relation in-unit closure with cycles allowed, RFC-021 Operation binding, Nest/Prisma independence. GraphQL → core translation only; no new core semantics or emitters. M4 (implementation planning) authorized for `#109`.  
**Package:** `@resource-forge/graphql` (GraphQL translation integration; consumes `@resource-forge/core`)  
**Tracking:** [#109](https://github.com/rexescario-dev/resource-forge/issues/109)  
**Depends on:** RFC-001 (Resource Identity), RFC-002 (Metadata Model), RFC-003 (Registry Contracts — optional multi-resource input via existing registry association), RFC-005 (Resource Model — `Resource`, `validateResource`, `projectResourceMetadata`), RFC-006 (Annotations — currently authorized concrete projection source; **no M4.2 GraphQL key mappings defined by this RFC**), RFC-007 / RFC-009 / RFC-013 / RFC-014 (Fields), RFC-008 / RFC-010 / RFC-011 / RFC-015 (Relations), RFC-012 / RFC-021 (Operations — kind, signature, thin invoke), RFC-023 (Projection Composition — no silent emitters), RFC-029 (Runtime Traversal / Query — meaning floor for related-set access; not a GraphQL API), RFC-030 (Relation→metadata non-contribution closure), RFC-031 (Nest host — **closed**; dependency independence only)  
**Followed by:** M4.2 implementation planning/delivery for `#109` after Accept; M4.3 Prisma; Nest↔GraphQL composition only if separately Accepted; metadata-emitter RFCs remain separate future candidates  
**Unblocks:** A GraphQL translation boundary that generates schema and resolver contracts from core Resources without GraphQL concerns entering `@resource-forge/core`

**Amends / specializes:** Opens M4 Integrations for GraphQL only. Does **not** reopen or extend M3, RFC-005–RFC-030, RFC-031 Nest hosting, deferred metadata-emitter work, or RFC-028 persistence correspondence realization / Prisma adapter design.

## Primary question

> How does `@resource-forge/graphql` translate core Resources into GraphQL schema and resolver surfaces without making GraphQL-specific concerns part of `@resource-forge/core`, and without requiring Nest or Prisma?

## Thesis

RFC-032 locks M4.2 as a **GraphQL translation layer** for Resource Forge:

- **`@resource-forge/graphql` is the GraphQL integration package.** It depends on `@resource-forge/core`. Core MUST NOT depend on GraphQL.
- **GraphQL is a consumer/translation layer**, not a source of new core semantics, declaration members, projection sources, or registry behaviors.
- **Schema structure is authoritative from the core `Resource`** (`identity` + `schema` members: Fields, Relations, Operations). Projected metadata is never the authority for Field/Relation/Operation structure.
- **Projected metadata is inert for M4.2 schema/resolver contracts** unless a previously Accepted metadata key already defines an explicit GraphQL mapping. This RFC defines **no** such keys and does **not** authorize Field/Operation/Relation metadata emitters (RFC-023 / RFC-030 preserved).
- **Schema generation and resolver generation are paired outputs** of one fail-closed translation. A successful translation yields both a GraphQL schema contract and resolver-binding contracts consistent with that schema.
- **Naming is identity-preserving for member names:** `FieldName`, `RelationName`, and `OperationParamName` are used directly as GraphQL field/argument names; illegal or reserved GraphQL names fail closed. `ResourceIdentity` and `ResourceIdentity + OperationName` use deterministic naming functions with reserved-name rejection; those functions are **not assumed injective** — output collisions among distinct inputs MUST fail closed.
- **`optional` × `nullable` have a normative GraphQL semantic mapping** for Fields, Relations, and Operation parameters (§5.3). SDL alone cannot express all four states everywhere; runtime contracts restore the missing dimensions without collapsing `optional` into `nullable` as meanings.
- **`void` Operations use a canonical GraphQL success type** owned by `@resource-forge/graphql` (`RfVoid`), not a core type and not an implementation-chosen ad hoc scalar.
- **Operations map by kind** (`query` → GraphQL Query root fields; `command` → GraphQL Mutation root fields) and bind to the existing RFC-021 thin invocation contract.
- **Translation is fail-closed**, including zero-field Resource object types, empty units, units with no mappable `query` Operations (Query-root closure), naming/reserved collisions, missing Relation targets, invalid Resources, and unmappable constructs. Partial schema/resolver sets MUST NOT be presented as success.
- **Integrations remain independent.** GraphQL MUST NOT depend on `@resource-forge/nest` or `@resource-forge/prisma`. RFC-031 Nest hosting remains closed and separate.

```text
Invariant:
  GraphQL translates core; core does not know GraphQL.
  Resource schema is structural authority; metadata overlay is inert in M4.2.
  Translation success ≡ complete schema + resolver contracts (fail-closed).

Naming:
  ResourceIdentity              → GraphQL type naming function (deterministic)
  FieldName                     → GraphQL field name (identity-preserving)
  RelationName                  → GraphQL field name (identity-preserving)
  OperationParamName            → GraphQL argument name (identity-preserving)
  ResourceIdentity+OperationName → GraphQL root field naming function (deterministic)

Core Resource(s)
  ├── validateResource
  └── schema.fields / relations / operations → GraphQL types & root fields

@resource-forge/graphql
  ├── schema generation
  └── resolver-binding contracts (Field/Relation access + RFC-021 invoke)
```

## 1. Scope

### 1.1 Goals

1. Define the GraphQL ↔ core translation boundary for M4.2.
2. Establish `@resource-forge/graphql` as the package that owns GraphQL schema and resolver generation contracts.
3. Lock **Resource schema** as the structural authority for GraphQL types/fields/operations translation.
4. State that projected metadata has **no M4.2 effect** on generated schema/resolver contracts unless a previously Accepted key defines an explicit GraphQL mapping (none are defined here).
5. Define paired **schema generation** and **resolver generation** outputs for a translation unit.
6. Map Fields, Relations, and Operations to GraphQL surfaces using existing core member contracts (including RFC-021 `kind` / signature / invoke).
7. Lock **identity-preserving member naming**, deterministic Resource/Operation naming, and reserved/introspection fail-closed rules.
8. Lock normative **`optional` × `nullable`** GraphQL semantics for Fields, Relations, and Operation parameters.
9. Lock canonical GraphQL representation of Operation `result: "void"`.
10. Specify **fail-closed translation boundaries**, including GraphQL single-namespace collisions, zero-field Resource types, and reserved-name conflicts.
11. Preserve dependency direction: GraphQL → core only; no Nest/Prisma coupling.
12. Explicitly fence Nest hosting reopen, Prisma/ORM realization, new core semantics, and metadata emitters out of this RFC.

### 1.2 Non-goals

This RFC does not define:

1. Nest discovery / DI / hosting lifecycle, or any reopen of RFC-031
2. Nest + GraphQL server glue as a required M4.2 dependency (any Nest↔GraphQL composition requires a separate Accepted RFC)
3. Prisma / SQL / ORM adapters or persistence engine realization (M4.3); RFC-028 correspondence is consumed only as an existing M3 floor and is **not** expanded here
4. New `@resource-forge/core` resource semantics, declaration members, projection sources, registry behaviors, or GraphQL-aware APIs in core
5. Field → metadata, Operation → metadata, or Relation-metadata **emitter** RFCs / implementations
6. A GraphQL-specific metadata model inside core, reverse projection (`GraphQL schema` → Resource), or any M4.2 annotation→GraphQL vocabulary
7. Query / navigation / traversal **host APIs** beyond binding to existing RFC-029 meaning and RFC-021 invoke — this RFC does not invent a core GraphQL query engine
8. Concrete GraphQL server runtime choice (Apollo, Yoga, Mercurius, etc.), federation/gateway, subscriptions, client SDKs, or wire productization beyond what is required to state schema/resolver contracts
9. CRUD auto-generation catalogs, Relay connection conventions, or opinionated pagination frameworks (unless a future RFC Accepts them)
10. Concrete TypeScript export spellings, GraphQL library pinning, codegen tooling, packaging, or CI layout (implementation-plan concerns)
11. Reopening M3, RFC-005–RFC-030, or deferred metadata-emitter questions
12. Alternate member-name transforms, silent renames, or invented structural fields (e.g. synthetic `id`) solely to satisfy GraphQL shape rules

### 1.3 Informative only

- Exact TypeScript export names and GraphQL library types may be refined during Accepted implementation planning so long as the semantic contracts in this RFC are preserved.
- Illustrative GraphQL SDL snippets below are normative in *role and mapping outcomes*, not in every printer/formatting detail.
- The exact character algorithm of the ResourceIdentity / root-field naming functions is an implementation-plan concern **only if** it remains a pure deterministic function of the stated inputs, obeys §5.1 legality/reserved rules, and obeys §5.1.4 collision detection (non-injectivity must not be assumed). Member names are **not** transformed by those functions.

## 2. Terminology

| Term | Meaning |
| --- | --- |
| GraphQL translation integration | `@resource-forge/graphql` behaviors that translate core Resources into GraphQL schema and resolver contracts |
| Translation unit | One or more already-constructed, successfully validated core `Resource` values presented together for a single translation attempt |
| Schema generation | Production of a GraphQL schema contract (types, fields, root operation fields) from a translation unit |
| Resolver generation | Production of resolver-binding contracts consistent with a successfully generated schema |
| Resolver binding / resolver contract | Normative description of how a generated field’s runtime value is obtained or how an Operation is invoked; not a requirement to emit a distinct GraphQL runtime resolver function when default resolution satisfies the contract |
| Structural authority | The core `Resource` (`identity` + `schema`) as the sole authority for which GraphQL structural members exist |
| Authorized projected metadata | `ResourceMetadata` produced by core `projectResourceMetadata` under the currently Accepted source inventory (today: annotations / RFC-006 only; RFC-030 Relation non-contribution) |
| GraphQL object field namespace | The single field-name namespace of a GraphQL object type (unlike core’s independent Field/Relation/Operation namespaces) |
| Legal GraphQL name | A name matching GraphQL `Name` lexical rules `[_A-Za-Z][_0-9A-Za-Z]*` that is not reserved under §5.1 |
| `RfVoid` | Canonical GraphQL object type owned by `@resource-forge/graphql` representing successful Operation `void` completion with no semantic scalar payload |
| Host-provided Resource instance surface | Host-owned runtime access path from which Field/Relation values for a resolved parent object are obtained; concrete shape is host-defined |
| Translation success | Schema generation and resolver generation both complete for the entire translation unit with no fail-closed condition |
| Translation failure | Any fail-closed condition; the integration MUST NOT present partial schema/resolver outputs as success |

RFC-001 / RFC-002 / RFC-003 / RFC-005 / RFC-007 / RFC-008 / RFC-009 / RFC-011 / RFC-012 / RFC-014 / RFC-015 / RFC-021 / RFC-023 / RFC-029 / RFC-030 terms keep their Accepted meanings. This RFC does not redefine them.

## 3. Package and dependency boundary

1. M4.2 product surface lives in **`@resource-forge/graphql`**.
2. `@resource-forge/graphql` MAY depend on `@resource-forge/core` and on GraphQL ecosystem libraries as package/peer dependencies as needed to express schema/resolver contracts.
3. `@resource-forge/core` MUST NOT depend on GraphQL packages, `@resource-forge/graphql`, Nest, `@resource-forge/nest`, Prisma packages, or `@resource-forge/prisma`.
4. `@resource-forge/graphql` MUST NOT depend on `@resource-forge/nest` or `@resource-forge/prisma`.
5. GraphQL translation MUST consume existing core contracts; it MUST NOT fork or reimplement Resource validation, projection composition, Operation invocation semantics, or registry association semantics inside a GraphQL-specific parallel model.
6. Presence of Nest or Prisma in an application MUST NOT be required for `@resource-forge/graphql` translation to succeed.

## 4. Inputs and authority

### 4.1 Structural authority

1. For each Resource in the translation unit, **structural GraphQL members** are derived only from:
   - `Resource.identity` (for type / root-field naming inputs);
   - `Resource.schema.fields`;
   - `Resource.schema.relations`;
   - `Resource.schema.operations`.
2. `ResourceMetadata` / annotations MUST NOT be treated as structural authority for Fields, Relations, or Operations.
3. Absence of annotations MUST NOT prevent structural translation of a valid Resource that is otherwise mappable.

### 4.2 Projected metadata (inert in M4.2)

1. RFC-032 defines **no mandatory metadata keys** for GraphQL translation.
2. Unless a **previously Accepted** metadata key already has an **explicitly defined GraphQL mapping**, projected metadata MUST have **no effect** on generated schema or resolver contracts in M4.2.
3. This RFC defines **no** such GraphQL mappings. Therefore, for M4.2, calling or not calling `projectResourceMetadata` MUST NOT change structural translation outcomes.
4. This RFC DOES NOT authorize Field → metadata, Operation → metadata, or Relation → metadata contribution.
5. Future RFCs MAY define explicit annotation/metadata → GraphQL mappings; until then metadata remains available in core but inert for this integration’s generated contracts.

### 4.3 Validation gate

1. Every Resource in the translation unit MUST successfully pass core `validateResource` before schema/resolver generation proceeds for that unit.
2. GraphQL MUST NOT translate an invalid Resource.
3. GraphQL MUST NOT invent GraphQL-local validation that replaces or weakens core Resource validity.

### 4.4 Translation unit composition

1. A translation unit is an explicit set of Resources supplied to the GraphQL integration (for example values obtained from a core `ResourceRegistry` lookup surface, or an application-provided list).
2. This RFC does **not** require GraphQL to own registry lifecycle; registry association remains RFC-003.
3. **Empty translation unit (zero Resources) is a translation failure.** Producing a successful “empty/minimal” schema with no Resource-derived surface would require inventing GraphQL structure unrelated to the Resource model, which this RFC forbids. Therefore zero Resources MUST fail closed (§8).
4. **Query-root closure:** A GraphQL schema requires a query root Object type, and that Object type MUST define at least one field. Under this RFC, Query-root fields come only from Operations with `kind === "query"`. Therefore a successful translation unit MUST contain at least one successfully mappable `query` Operation after validation and naming. A non-empty unit that has Resources (and even `command` Operations) but **zero** mappable `query` Operations MUST fail closed (§8). M4.2 MUST NOT synthesize a Query field, expose Resource object types directly as root fields, invent a placeholder Query root, or otherwise invent non-Resource GraphQL API structure solely to satisfy the GraphQL query-root requirement.
5. Nest hosting is neither required nor implied to obtain the translation unit.

## 5. Schema generation (normative mapping)

### 5.1 GraphQL naming rules (normative)

#### 5.1.1 Name classes

| Source | GraphQL target | Naming rule |
| --- | --- | --- |
| `ResourceIdentity` | GraphQL object type name | Deterministic naming function of `(namespace, name)` owned by `@resource-forge/graphql` |
| `FieldName` | GraphQL object field name | **Identity-preserving:** used directly |
| `RelationName` | GraphQL object field name | **Identity-preserving:** used directly |
| `OperationParamName` | GraphQL argument name | **Identity-preserving:** used directly |
| `ResourceIdentity` + `OperationName` | GraphQL root field name (`Query` / `Mutation`) | Deterministic naming function of those inputs owned by `@resource-forge/graphql` |

M4.2 MUST NOT introduce a transform layer for Field/Relation/parameter names. GraphQL MUST NOT become a second naming-semantics system for those members.

#### 5.1.2 Legality

A GraphQL name used by this translation is **legal** only if all of the following hold:

1. It matches GraphQL `Name` lexical grammar: `[_A-Za-Z][_0-9A-Za-Z]*`.
2. It does **not** begin with `__` (GraphQL introspection namespace / introspection types).
3. If it is a **GraphQL type name**, a Resource-derived GraphQL object type name MUST NOT conflict with any of:
   - GraphQL **built-in scalar** type names: `Int`, `Float`, `String`, `Boolean`, `ID`;
   - GraphQL **introspection** types (names beginning with `__`, including but not limited to `__Schema`, `__Type`, `__Field`, `__InputValue`, `__EnumValue`, `__Directive`);
   - GraphQL **root** type names reserved by this RFC: `Query`, `Mutation`, `Subscription`;
   - any **GraphQL-owned integration type** name defined by this RFC (including `RfVoid`).
4. If it is a field or argument name, it is not otherwise illegal under (1)–(2).

**Contract summary:** A Resource-derived GraphQL object type name MUST NOT conflict with any GraphQL built-in type, introspection type, GraphQL root type reserved by this RFC, or GraphQL-owned integration type.

#### 5.1.3 Fail-closed naming outcomes

Translation MUST fail closed when any of the following holds:

1. A deterministic **type** naming function yields an illegal or reserved type name (§5.1.2), including a Resource-derived type name equal to a GraphQL built-in scalar (`Int`, `Float`, `String`, `Boolean`, `ID`), an introspection type, a reserved root type (`Query` / `Mutation` / `Subscription`), or a GraphQL-owned integration type (including `RfVoid`).
2. A deterministic **root-field** naming function yields a name that fails §5.1.2 lexical / `__*` rules (root-field names are not subject to the built-in/root/integration **type**-name reservation list).
3. A `FieldName`, `RelationName`, or `OperationParamName` is not a legal GraphQL name under §5.1.2 lexical / `__*` rules (identity-preserving; no repair rename).
4. Two Resources map to the same GraphQL type name.
5. Two root fields collide within `Query` or within `Mutation` after deterministic naming.
6. Within one Resource object type, a Field and Relation share the same name (§5.8).
7. A Resource-derived GraphQL object type name equals any GraphQL-owned integration type name, including `RfVoid` (same type namespace collision).

Silent rename, drop, merge, or case-fold to force legality is forbidden. The ResourceIdentity naming algorithm remaining an implementation-plan concern does **not** authorize producing any type name forbidden by §5.1.2.

#### 5.1.4 Naming-function collision semantics (non-injectivity)

The ResourceIdentity → type-name function and the `(ResourceIdentity, OperationName)` → root-field-name function are **deterministic** and owned by `@resource-forge/graphql`. Exact character algorithms may be chosen in Accepted implementation planning, subject to §5.1.2–5.1.3.

Normative collision contract:

1. Those functions are **not required to be injective**. Distinct `ResourceIdentity` values MAY map to the same GraphQL type name; distinct `(ResourceIdentity, OperationName)` pairs MAY map to the same root field name within `Query` or within `Mutation`.
2. Whenever such a many-to-one mapping occurs for inputs present in the translation unit, translation MUST **detect the collision and fail closed** (§5.1.3 items 4–5). Silent overwrite, last-wins, merge, or “semantically ambiguous but legal” success is forbidden.
3. Implementation MUST NOT rely on the naming function being injective to satisfy uniqueness. Collision detection after applying the function is the normative uniqueness mechanism.
4. A legal GraphQL name that is ambiguous across distinct identities or distinct `(ResourceIdentity, OperationName)` pairs is still a **translation failure** when it arises within one translation unit — legality alone is not success.
5. Deferring the character algorithm to implementation planning does **not** authorize omitting collision detection or treating injectivity as an implicit assumption.

### 5.2 Resource → GraphQL object type

1. Each Resource in a successful translation MUST correspond to exactly one GraphQL object type in that schema.
2. GraphQL object type names are produced by the ResourceIdentity naming function (§5.1).
3. **Zero-field Resource rule:** After Field and Relation mapping, if a Resource’s GraphQL object type would have **zero** fields, that Resource is an **unmappable construct** and translation MUST fail closed.
4. GraphQL MUST NOT invent synthetic structural fields (including `id`, `_`, or placeholder fields) solely to make an empty object type valid.
5. Consequence: a valid core Resource that has empty `fields` and empty `relations` (even if it has Operations) is unmappable in M4.2, because Operations map to roots, not object fields, and GraphQL object types cannot be fieldless under this RFC’s fail-closed rule.
6. Self-relations and cyclic Relation graphs are allowed when every referenced target identity is present in the translation unit (§5.4). Acyclicity is **not** required.

### 5.3 `optional` × `nullable` semantic mapping (normative)

Core keeps `optional` (declaration presence) and `nullable` (nullability) as independent booleans. GraphQL’s type system does **not** provide two independent SDL dimensions that match those meanings in every position. M4.2 therefore locks:

- **SDL encoding** (what the GraphQL type/argument declaration expresses), and
- **Runtime contract** (what resolve/argument binding must enforce),

without redefining core flags and without collapsing their meanings into each other.

Let `Base` be the GraphQL base type being wrapped (`String` / `Float` / `Boolean` / object type / list-wrapped object type as applicable).

#### 5.3.1 Shared four-state meaning

| Core `optional` | Core `nullable` | Required GraphQL meaning |
| --- | --- | --- |
| `false` | `false` | Required / non-null: value must be present and non-null |
| `false` | `true` | Required but nullable: value must be present; may be null |
| `true` | `false` | Optional presence; when present must be non-null (omit allowed; explicit null not allowed) |
| `true` | `true` | Optional presence; omit and explicit null both allowed |

#### 5.3.2 Output object fields (Fields; Relation associations)

For GraphQL **output** fields:

1. **SDL nullability tracks `nullable` only:**
   - `nullable=false` → GraphQL type `Base!`
   - `nullable=true` → GraphQL type `Base`
2. **`optional` is not a distinct SDL output dimension.** Selected GraphQL output fields are always materialized in the response payload for a non-null parent.
3. **Runtime presence contract** against the host-provided Resource instance surface:
   - `optional=false` and value absent → resolver contract failure
   - `optional=true`, `nullable=true`, value absent → resolve as GraphQL `null`
   - `optional=true`, `nullable=false`, value absent → resolver contract failure (cannot omit under GraphQL response rules and cannot return null under `Base!`)
4. **Response collapse (acknowledged):** when `optional=true` and `nullable=true`, GraphQL success payloads MAY use `null` for both core-absent and core-null instance states. Core instance distinction remains authoritative on the host instance surface outside the GraphQL payload; GraphQL translation MUST NOT invent a second wire token to preserve that distinction in M4.2.
5. Translation MUST NOT coerce `optional` into `nullable` or the reverse as core meanings.

#### 5.3.3 Operation arguments (inputs)

For GraphQL **input arguments** mapped from Operation parameters:

1. **SDL encoding:**
   - (`optional=false` ∧ `nullable=false`) → argument type `Base!`
   - all other combinations → argument type `Base` (nullable GraphQL input type)
2. GraphQL SDL alone **under-approximates** (`optional=false`, `nullable=true`) and (`optional=true`, `nullable=false`). Those states remain valid core declarations and **MUST NOT** fail closed merely because SDL cannot express them alone.
3. **Runtime argument contract** restores the four-state meaning using GraphQL request argument presence (omitted vs provided) plus value nullness, then feeds RFC-021 argument-map validation:
   - (`false`,`false`): must be present and non-null (`Base!`)
   - (`false`,`true`): argument key MUST be present; value MAY be null; omission → argument contract failure
   - (`true`,`false`): omission OK; if present, value MUST be non-null (explicit null → argument contract failure)
   - (`true`,`true`): omission OK; explicit null OK
4. After GraphQL argument capture, Operation invocation MUST still follow RFC-021 argument-map rules (unknown keys, types, duplicates, etc.).

#### 5.3.4 Where this mapping applies

1. **Fields** — §5.3.2 with `Base` = scalar mapping from §5.5.
2. **Relations (`one`)** — §5.3.2 with `Base` = target GraphQL object type (`Target`).
3. **Relations (`many`)** — element type is always `Target!`. The list wrapper is non-null exactly when `nullable=false`, and nullable when `nullable=true`:
   - `nullable=false` → GraphQL type `[Target!]!`
   - `nullable=true` → GraphQL type `[Target!]`
   - `optional` remains a runtime presence obligation as defined by §5.3.2 (not a distinct SDL list-wrapper dimension).
4. **Operation parameters** — §5.3.3 with `Base` = scalar mapping from §5.5.
5. Null-elements-inside-`many` and empty-vs-absent collection nuances remain governed by Accepted Relation/value-state floors (including RFC-025); this RFC does not redefine them. GraphQL list element type for related instances remains the non-null target object type (`Target!`).

### 5.4 Relations → object fields

1. Each core Relation MUST map to exactly one field on that Resource’s GraphQL object type, named with the identity-preserving `RelationName` (§5.1).
2. The GraphQL field’s type refers to the GraphQL object type for the Relation’s target Resource identity when that target is present in the translation unit.
3. If a Relation target identity is **not** present in the translation unit, translation MUST fail closed (no dangling external type inventing).
4. **Closure, not acyclicity:** targets may form self-relations or cycles (`A→A`, `A→B→A`, `A→B→C→A`, …) provided **every** referenced Resource identity exists in the translation unit.
5. Multiplicity `"one"` uses §5.3.2 with `Base = Target`; multiplicity `"many"` uses the explicit `[Target!]!` / `[Target!]` lock in §5.3.4; `optional` remains a runtime presence obligation per §5.3.2.
6. Relations remain structural members of the Resource schema. GraphQL MUST NOT require Relation→metadata projection (RFC-030 preserved).

### 5.5 Fields → object fields

1. Each core Field MUST map to exactly one field on that Resource’s GraphQL object type, named with the identity-preserving `FieldName` (§5.1).
2. Scalar mapping uses RFC-009 `FieldType`:
   - `"string"` → GraphQL `String`
   - `"number"` → GraphQL `Float` (canonical GraphQL numeric scalar for core `number` in M4.2)
   - `"boolean"` → GraphQL `Boolean`
3. `optional` × `nullable` follow §5.3.2.
4. Field order in core is not required to dictate GraphQL SDL print order.

### 5.6 Operations → root fields

1. Operations are **not** fields on the Resource object type. They map to GraphQL root fields:
   - `kind === "query"` → field on the GraphQL `Query` root type;
   - `kind === "command"` → field on the GraphQL `Mutation` root type.
2. Root field names are produced by the deterministic `ResourceIdentity + OperationName` naming function (§5.1).
3. After naming, root-field name collision within `Query` or within `Mutation` MUST fail closed.
4. **Query-root closure (unit-level):** After mapping all Operations in the translation unit, if zero Query-root fields were generated, translation MUST fail closed (§4.4 / §8). Presence of Resource object types and/or Mutation-root fields alone is not sufficient.
5. Operation `params` map to GraphQL field arguments:
   - argument name = identity-preserving `OperationParamName` (§5.1);
   - argument types/scalars as §5.5;
   - `optional` × `nullable` as §5.3.3.
6. Operation `result`:
   - Operation `result` is **not** represented with an `optional` × `nullable` pair in RFC-021; therefore all **non-void** Operation results are translated as **non-null** GraphQL results.
   - `"string"` / `"number"` / `"boolean"` → corresponding GraphQL scalar return type as `Base!` (non-null).
   - `"void"` (commands only, per RFC-021) → GraphQL type **`RfVoid!`** (§5.7).
   - This RFC does **not** authorize nullable Operation results; any future nullable/optional Operation result requires a separate Accepted core RFC before GraphQL may map it.
7. GraphQL MUST NOT invent additional Operation kinds, CRUD verb catalogs, or transport methods.

### 5.7 Canonical `void` representation (`RfVoid`)

GraphQL has no native void return type. M4.2 locks a single canonical representation:

```graphql
type RfVoid {
  ok: Boolean!
}
```

Normative rules:

1. `RfVoid` is a **GraphQL translation artifact** owned by `@resource-forge/graphql`. It is **not** a core Resource, Field, or metadata type.
2. On successful RFC-021 void completion (no semantic scalar payload), the Operation resolver MUST resolve to `{ ok: true }`.
3. `ok: true` conveys GraphQL-level successful completion only. It is **not** a portable core semantic result payload and MUST NOT be treated as inventing a core `boolean` result for a `void` Operation.
4. If the translation unit includes one or more `result: "void"` Operations, the generated schema MUST include `RfVoid`.
5. `RfVoid` occupies the GraphQL type-name namespace of the generated schema. If any Resource-derived object type name equals `RfVoid` (or any other GraphQL-owned integration type name), translation MUST fail closed (§5.1.3).
6. Alternate encodings (`Boolean!`, ad hoc unit scalars, empty objects without fields, per-implementation choices) are **not** permitted in M4.2.
7. GraphQL MUST NOT invent a portable void type inside `@resource-forge/core`.

### 5.8 Core independent namespaces vs GraphQL single field namespace

Core permits a Field, Relation, and Operation to share the same name string on one Resource (independent namespaces). GraphQL object types have a **single** field namespace.

Normative collision rules for M4.2:

1. If any `FieldName` equals any `RelationName` on the same Resource, schema generation for that translation unit MUST fail closed.
2. Operations mapped only to root types do **not** collide with object-type Field/Relation names solely by sharing the OperationName string.
3. GraphQL MUST NOT silently rename, drop, or merge colliding Field/Relation members to force success.
4. Future RFCs MAY introduce alternate namespacing strategies; M4.2 does not.

### 5.9 Constraints and other schema members

1. Core `constraints` are **not** required to generate GraphQL schema members in M4.2.
2. Constraint runtime enforcement remains a core/host concern (RFC-016–RFC-020). GraphQL MAY surface constraint failures as resolver/application errors when a host invokes operations or writes values; this RFC does not define a GraphQL constraint SDL vocabulary.

## 6. Resolver generation (normative binding)

Resolver generation is successful only together with schema generation for the same translation unit (§8).

### 6.1 Field resolver contracts

1. Every generated Field MUST have a **resolver contract** describing how its runtime value is obtained from the host-provided Resource instance surface, including the §5.3.2 presence/nullability obligations.
2. The implementation MAY satisfy that contract through an explicit GraphQL resolver function **or** GraphQL-native default field resolution, provided the contract’s semantics are preserved.
3. GraphQL MUST NOT invent a core persistence or query engine to satisfy Field reads.
4. Scalar validation remains aligned with core Field value semantics; GraphQL adapters MUST NOT silently coerce across scalar types in a way that violates RFC-009 value rules.

### 6.2 Relation resolver contracts

1. Every generated Relation field MUST have a **resolver contract** whose success/failure classification respects RFC-029 related-set / not-loaded meaning where applicable, and whose presence/nullability follows §5.3.
2. The implementation MAY satisfy that contract through an explicit resolver or other GraphQL-host mechanism that preserves the contract.
3. Host-owned retrieval of related instances is allowed; GraphQL translation defines the binding contract, not Nest-specific loading.
4. GraphQL MUST NOT redefine cascade (RFC-026), load/fetch floors (RFC-027), or persistence correspondence (RFC-028).

### 6.3 Operation resolvers

1. Each generated root Operation field MUST bind to the RFC-021 thin invocation contract for that Resource + `OperationName` (declaration validity → lookup → argument validation → handler resolution → invoke → result validation), with GraphQL argument capture obeying §5.3.3.
2. Missing handler is an invocation/host-contract failure at **resolve time**, not a schema-generation success condition.
3. For `result: "void"`, successful completion MUST resolve to `RfVoid` `{ ok: true }` (§5.7).
4. GraphQL MUST NOT reimplement Operation argument/result rules with divergent semantics.
5. Handler application errors remain classified per RFC-021 / host model; this RFC does not invent a GraphQL-specific business-error taxonomy.

### 6.4 Handler and instance provider boundary

1. How an application supplies Operation handlers and instance/Relation data sources is host-owned.
2. The concrete shape of the host-provided Resource instance surface is host-defined; this RFC requires only that Field/Relation resolver contracts can obtain values/associations from it.
3. `@resource-forge/graphql` MAY define GraphQL-local registration/binding helpers for those host obligations.
4. Those helpers MUST NOT move GraphQL types into `@resource-forge/core` and MUST NOT require Nest or Prisma packages.

## 7. Paired outputs and readiness

1. A translation attempt produces either:
   - **success:** complete schema contract + complete resolver-binding contracts for the entire translation unit; or
   - **failure:** no successful translation result.
2. Schema-without-resolvers and resolvers-without-schema are **not** successful M4.2 translation outcomes.
3. Concrete packaging of the pair (single return object, builder, etc.) is an implementation-plan concern; the pairing obligation is normative.

## 8. Fail-closed translation boundaries

Translation MUST fail closed when any of the following holds for the translation unit:

1. Any Resource fails `validateResource`.
2. FieldName/RelationName collision on the same Resource (§5.8).
3. GraphQL object type name collision after deterministic ResourceIdentity naming (§5.1).
4. GraphQL root field name collision after deterministic ResourceIdentity+OperationName naming (§5.1 / §5.6).
5. A Resource-derived **type** name is illegal or reserved under §5.1.2 (including `__*` introspection type names; GraphQL built-in scalars `Int` / `Float` / `String` / `Boolean` / `ID`; root type names `Query` / `Mutation` / `Subscription`; and GraphQL-owned integration type names including `RfVoid`).
6. A field name, argument name, or root field name fails §5.1.2 lexical / `__*` rules (identity-preserving member names; no reserved-type list applies to ordinary field/argument names beyond those lexical rules).
7. A Resource-derived GraphQL object type name equals any GraphQL built-in type, introspection type, reserved root type, or GraphQL-owned integration type name, including `RfVoid` (§5.1.2 / §5.1.3 / §5.7).
8. The translation unit contains zero Resources (§4.4).
9. **No Query root fields:** the translation unit contains zero successfully mappable `query` Operations, so no Query-root Operation field can be generated (§4.4 / §5.6).
10. Relation target Resource identity is not included in the translation unit (§5.4).
11. A Resource would produce a GraphQL object type with zero fields (§5.2).
12. An Operation/Field/Relation construct in scope for M4.2 mapping is encountered but cannot be represented under the closed scalar/list/object/`RfVoid` mappings of this RFC without inventing new core semantics.
13. Translation would require inventing a Field/Operation/Relation metadata emitter, inventing M4.2 metadata→GraphQL vocabulary, or otherwise violating RFC-023 / RFC-030 / §4.2.
14. Any implementation attempts to present a partial schema/resolver set as success after one of the above conditions.

On failure:

1. The integration MUST NOT claim translation success.
2. Partial artifacts MUST NOT be advertised as the successful schema/resolver pair.
3. Error reporting shape is an implementation concern; the fail-closed obligation is normative.

Non-failures (clarifications):

1. Empty annotations / unused projected metadata → OK (inert per §4.2).
2. Empty `operations` on an individual Resource that still has ≥1 mappable Field or Relation → OK for that Resource’s object type (roots gain no fields from that Resource), **provided the translation unit as a whole still produces a valid Query root from other Resources’ mappable `query` Operations** (§4.4 / §5.6).
3. Self-relations and cyclic Relation graphs with all targets in-unit → OK per §5.4.
4. Missing Operation handler at runtime → resolver invocation failure, not schema translation failure.
5. (`optional`,`nullable`) combinations that require runtime reinforcement beyond SDL (§5.3) → OK; they are mappable, not unmappable.

Notes (failures, not non-failures):

1. Empty translation unit (zero Resources) → **failure** per §4.4 / §8 item 8.
2. Non-empty unit with zero mappable `query` Operations → **failure** per §4.4 / §5.6 / §8 item 9.

## 9. Worked example (informative)

```text
Resources in unit:
  crm/Customer {
    fields: [ { name: id, type: string, optional: false, nullable: false },
              { name: email, type: string, optional: false, nullable: false } ]
    relations: [ { name: orders, target: crm/Order, multiplicity: many, ... } ]
    operations: [
      { name: getById, kind: query, params: [{ name: id, type: string, optional: false, nullable: false }], result: string },
      { name: create, kind: command, params: [...], result: string },
      { name: purge, kind: command, params: [], result: void }
    ]
  }
  crm/Order {
    fields: [ { name: id, type: string, optional: false, nullable: false } ]
    relations: [ { name: customer, target: crm/Customer, multiplicity: one, ... } ]  // cycle OK
    operations: []
  }

Translation success yields (roles):
  GraphQL object types named by deterministic(ResourceIdentity) for Customer and Order
  Customer.id / Customer.email — identity-preserving field names
  Customer.orders → [Order!]! when Relation nullable=false (or [Order!] when nullable=true)
  Order.customer → Customer (cycle allowed; both identities in unit)
  Query.<deterministic(crm/Customer,getById)>(id: String!): String!
  Mutation.<deterministic(crm/Customer,create)>(...): String!
  Mutation.<deterministic(crm/Customer,purge)>: RfVoid!
  schema includes type RfVoid { ok: Boolean! }
  Resolver contracts for object fields + root fields

Failure examples:
  Field name "owner" and Relation name "owner" on same Resource
    → Field/Relation GraphQL field-namespace collision → fail
  Resource with empty fields and empty relations (operations only)
    → zero GraphQL object fields → fail
  Deterministic type name resolves to "Query"
    → reserved GraphQL root type name → fail
  Deterministic type name resolves to "String" (or Int / Float / Boolean / ID)
    → conflict with GraphQL built-in scalar → fail
  Deterministic type name resolves to "RfVoid"
    → collision with GraphQL-owned integration type → fail
  FieldName / param name illegal under GraphQL Name / __* rules
    → identity-preserving mapping cannot proceed → fail
  Unit has Resources + fields but zero query Operations (commands only or none)
    → no Query-root fields → fail (Query-root closure)
```

## 10. Rationale

1. **Resource as structural authority** preserves M3’s model: metadata is projected, not authoritative schema.
2. **Inert metadata in M4.2** avoids speculative GraphQL annotation vocabulary while keeping RFC-023 / RFC-030 intact.
3. **Identity-preserving member names** keep GraphQL from becoming another naming semantics layer; fail-closed legality is simpler than silent transforms.
4. **Normative optional×nullable mapping** prevents M4 from inventing presence/null semantics; SDL + runtime split matches GraphQL’s real expressiveness.
5. **Canonical `RfVoid`** removes implementation drift on void Operations without inventing core void types.
6. **Zero-field fail-closed** respects GraphQL object-type rules without synthesizing core fields.
7. **Paired schema + resolvers** matches the roadmap and prevents schema-only drift from invocation contracts.
8. **Operations on roots by kind** maps RFC-021 `query`/`command` onto GraphQL Query/Mutation without object-type namespace collisions.
9. **Relation closure without acyclicity** allows real models while still forbidding invented external types.
10. **Independence from Nest/Prisma** preserves M4 sequencing and RFC-031 closure.

## 11. Relationships / traceability

| Dependency | Relationship |
| --- | --- |
| RFC-001 Identity | Consumed — naming inputs; no alternate GraphQL identity system |
| RFC-002 Metadata | Relied on — metadata remains core-valid; **inert for M4.2 GraphQL contracts** under §4.2 |
| RFC-003 Registry | Relied on optionally — translation unit may be sourced from registry; GraphQL does not redefine association |
| RFC-005 Resource model | Consumed — `Resource`, `validateResource`, `projectResourceMetadata` |
| RFC-006 Annotations | Relied on as current projection source inventory; **no GraphQL key mappings defined here** |
| RFC-007 / RFC-009 / RFC-014 Fields | Consumed — object field structure, scalars, optional/nullable |
| RFC-008 / RFC-010 / RFC-011 / RFC-015 Relations | Consumed — relation object fields, multiplicity, optional/nullable |
| RFC-012 / RFC-021 Operations | Consumed — root field mapping + invoke binding; no Operation→metadata |
| RFC-023 Composition | Preserved — no silent emitters |
| RFC-025 Value-state | Relied on — empty/absent/null-element nuances not redefined by GraphQL list encoding |
| RFC-029 Traversal / Query | Consumed as meaning floor for Relation resolver classification; not extended into a GraphQL query AST/API in core |
| RFC-030 Relation→metadata | Preserved — non-contribution; GraphQL uses Relation schema members directly |
| RFC-028 Persistence correspondence | **Not realized** — Prisma/ORM deferred to M4.3 |
| RFC-031 Nest host | **Closed / independent** — GraphQL MUST NOT depend on Nest; Nest MUST NOT be reopened here |
| M3 milestone | **Closed** — RFC-032 does not reopen M3 or RFC-005–030 |

## 12. Acceptance criteria (for this specification)

This RFC may move from Draft to Accepted when Design Review finds:

1. The GraphQL ↔ core boundary is clear: GraphQL depends on core; core has no GraphQL concerns.
2. GraphQL is locked as a consumer/translation layer, not a source of new core semantics.
3. Structural authority is the core `Resource` schema; projected metadata is inert for M4.2 contracts under §4.2 (no emitters; no invented GraphQL metadata vocabulary).
4. Naming rules are normative: identity-preserving Field/Relation/param names; deterministic Resource/root naming; Resource-derived type names fail closed on GraphQL built-in scalars, introspection types, reserved roots, and GraphQL-owned integration types (including `RfVoid`); naming functions are not assumed injective — collisions among distinct inputs MUST fail closed (§5.1.4).
5. The four `optional` × `nullable` states have normative SDL + runtime mappings for output fields and Operation arguments; Relation `many` SDL is explicitly `[Target!]!` vs `[Target!]`.
6. `void` Operations use canonical `RfVoid` / `{ ok: true }` and no alternate encodings; non-void Operation results are non-null because RFC-021 has no result `optional`×`nullable` pair.
7. Zero-field Resource object types fail closed; no synthetic structural fields.
8. Empty translation units (zero Resources) fail closed; units with Resources but zero mappable `query` Operations also fail closed (Query-root closure); no invented Query root or non-Resource GraphQL API surface.
9. Schema generation and resolver generation are paired success/failure outcomes; resolver obligations are contracts (explicit or default resolution allowed).
10. Fields, Relations, and Operations have normative GraphQL mapping roles, including Operation `query`→Query and `command`→Mutation; Relation closure allows cycles when targets are in-unit.
11. Fail-closed translation boundaries are explicit, including naming/reserved/integration-type collisions, Field/Relation collisions, empty translation units, missing Relation targets, invalid Resources, zero-field Resources, and ban on partial success.
12. Resolver bindings for Operations use RFC-021 invoke semantics; Relation bindings do not redefine RFC-029 / RFC-026 / RFC-027 / RFC-028.
13. Non-goals explicitly exclude Nest reopen, Nest↔GraphQL required glue, Prisma/ORM realization, metadata emitters, and core GraphQL APIs.
14. RFC-032 does not reopen M3 / RFC-005–030 / RFC-031 / deferred metadata emitters.

## 13. Explicit deferrals / follow-ons

| Topic | Disposition |
| --- | --- |
| Nest↔GraphQL server composition | Future RFC if required; not M4.2 |
| Prisma / ORM realization | M4.3 (consume RFC-028; do not expand it here) |
| Metadata emitters (Field/Operation/Relation) | Future RFC candidates; do not reopen M3 |
| Explicit annotation/metadata → GraphQL key mappings | Future RFC; inert in M4.2 |
| Alternate collision strategies / member-name transforms | Future RFC; M4.2 fails closed / identity-preserving |
| Synthetic fields for empty object types | Future RFC if ever desired; forbidden in M4.2 |
| Empty translation unit / invented Query root | Forbidden in M4.2 — fail closed (§4.4) |
| Unit with Resources but zero `query` Operations | Forbidden in M4.2 — fail closed (§4.4 / §5.6 Query-root closure) |
| Relay connections / pagination frameworks | Future RFC |
| Subscriptions / federation / gateway | Future RFC |
| GraphQL constraint SDL vocabulary | Future RFC |
| Distinguishing absent vs null in GraphQL output payloads | Future RFC; M4.2 acknowledges collapse when both optional and nullable |
| Richer Operation IO (nested/composite) | Blocked on future core Operation IO RFCs; not invented here |
| Exact ResourceIdentity / root-field naming algorithm characters | Implementation plan after Accept (must remain deterministic + §5.1-legal) |
| Concrete GraphQL library / codegen / CI | Implementation plan after Accept |

## 14. Document status

**Status: Accepted.** Authoritative for M4.2 GraphQL schema and resolver generation semantics. Do not begin M6 implementation until an Accepted implementation plan exists for `#109`. Prefer one pull request per tracking issue for the eventual delivery slice after Accept.
