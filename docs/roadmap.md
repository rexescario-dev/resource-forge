# Roadmap

Resource Forge grows by design before implementation. After the repository foundation (M1), core vocabulary is specified as RFCs, then implemented as contracts, then modeled, then integrated.

| Milestone | Focus | Status |
| --- | --- | --- |
| M1 | Repository & workspace foundation | Done |
| — | Core architecture RFCs (gate before M2) | Done |
| M2 | Core contracts (vocabulary, not behavior) | Done |
| M3 | Resource model | Done |
| M4 | Integrations (Nest → GraphQL → Prisma) | In progress — M4.1 Nest ✅ · M4.2 GraphQL ✅ · M4.3.1–M4.3.3 Prisma ✅ |
| M5 | CLI & end-to-end examples | In progress — M5.1 CLI Foundation ✅ · M5.2 validate ✅ · M5.3 doctor Accepted · [#121](https://github.com/rexescario-dev/resource-forge/issues/121) · [#124](https://github.com/rexescario-dev/resource-forge/issues/124) · [#128](https://github.com/rexescario-dev/resource-forge/issues/128) |

## Process: RFCs before contracts

Before implementing M2, architecture decisions are written as small RFCs under [`docs/superpowers/specs/`](superpowers/specs/). Implementation must not outrun design.

Planned RFCs for the M2 gate:

| RFC | Topic | Status |
| --- | --- | --- |
| RFC-001 | Resource identity | Accepted |
| RFC-002 | Metadata model | Accepted |
| RFC-003 | Registry contracts | Accepted |
| RFC-004 | Extension model | Accepted |

M3 gate RFCs:

| RFC | Topic | Status |
| --- | --- | --- |
| RFC-005 | Resource model | Accepted |
| RFC-006 | Annotations | Accepted — [#8](https://github.com/rexescario-dev/resource-forge/issues/8) |
| RFC-007 | Resource Fields (member + ordered `fields` sequence) | Accepted — [#13](https://github.com/rexescario-dev/resource-forge/issues/13) |
| RFC-008 | Resource Relations (member + ordered `relations` sequence) | Accepted — [#17](https://github.com/rexescario-dev/resource-forge/issues/17) |
| RFC-009 | Resource Field Types (required `{ name, type }`; closed `FieldType`) | Accepted — [#21](https://github.com/rexescario-dev/resource-forge/issues/21) |
| RFC-010 | Relation Association Semantics (required `{ name, target }`) | Accepted — [#26](https://github.com/rexescario-dev/resource-forge/issues/26) |
| RFC-011 | Relation Multiplicity (required `multiplicity: "one"\|"many"`) | Accepted — [#31](https://github.com/rexescario-dev/resource-forge/issues/31) |
| RFC-012 | Resource Operations (name-only Operation + ordered `operations` sequence) | Accepted — [#36](https://github.com/rexescario-dev/resource-forge/issues/36) |
| RFC-013 | Field/Relation Optionality (required `optional: boolean`) | Accepted — [#40](https://github.com/rexescario-dev/resource-forge/issues/40) |
| RFC-014 | Field Nullability (required `nullable: boolean` on Field) | Accepted — [#46](https://github.com/rexescario-dev/resource-forge/issues/46) |
| RFC-015 | Relation Nullability (required association-reference `nullable: boolean` on Relation) | Accepted — [#51](https://github.com/rexescario-dev/resource-forge/issues/51) |
| RFC-016 | Constraints (required ordered `constraints` + closed `{ name, kind }` framework) | Accepted — [#56](https://github.com/rexescario-dev/resource-forge/issues/56) |
| RFC-017 | Concrete Constraint Kinds (closed `range` \| `pattern` \| `enum`; Field-targeted; declaration-time only) | Accepted — [#61](https://github.com/rexescario-dev/resource-forge/issues/61) |
| RFC-018 | Runtime Constraint Enforcement (field-value map; inclusive `range`; ECMAScript `pattern`; `enum` membership; optional/nullable gates) | Accepted — [#66](https://github.com/rexescario-dev/resource-forge/issues/66) |
| RFC-019 | Intra-Instance Cross-Member Constraints (`distinct` \| `equal`; multi-field `fields`; single field-value map; population uniqueness deferred) | Accepted — [#70](https://github.com/rexescario-dev/resource-forge/issues/70) |
| RFC-020 | Population Uniqueness (closed `unique`; `field` / `fields`; Constraint-scoped occupancy provider; heterogeneous composites allowed) | Accepted — [#74](https://github.com/rexescario-dev/resource-forge/issues/74) |
| RFC-021 | Operation Kind / Signature / Execution (closed `command`\|`query`; scalar params; thin host invoke; void = no semantic result payload) | Accepted — [#77](https://github.com/rexescario-dev/resource-forge/issues/77) |
| RFC-022 | Annotation Vocabulary (closed `rf` catalog: `description` \| `displayName`; string value shapes; annotation-scoped enforcement; opaque non-`rf`) | Accepted — [#80](https://github.com/rexescario-dev/resource-forge/issues/80) |
| RFC-023 | Richer Projection — Composition Semantics (disjoint-union composition; hard `MetadataKey` collision; annotations sole concrete source; no new emitters) | Accepted — [#83](https://github.com/rexescario-dev/resource-forge/issues/83) |
| RFC-024 | Direction / Joins — Relationship Traversal Semantics (required `direction`; optional `inverse` + `{ local, remote }` `join`; reverse-edge identity; no runtime) | Accepted — [#86](https://github.com/rexescario-dev/resource-forge/issues/86) |
| RFC-025 | Value-State Semantics (absent / empty / association null / element null; empty≠absent; empty≢null; null elements forbidden) | Accepted — [#89](https://github.com/rexescario-dev/resource-forge/issues/89) |
| RFC-026 | Cascade Semantics (required `onDelete` / `onUpdate`; closed `CascadePolicy`; contract-level evaluation) | Accepted — [#92](https://github.com/rexescario-dev/resource-forge/issues/92) |
| RFC-027 | Loading / Fetch Semantics (required `fetch: eager\|lazy`; not-loaded ≠ value state) | Accepted — [#95](https://github.com/rexescario-dev/resource-forge/issues/95) |
| RFC-028 | Persistence / ORM Mapping (Resource-authoritative, one-way, total correspondence ledger; no new core surface) | Accepted — [#98](https://github.com/rexescario-dev/resource-forge/issues/98) |
| RFC-029 | Runtime Traversal / Query Semantics (semantic floor: step/path/set-valued related set; not-loaded = unclassifiable; no AST/API) | Accepted — [#100](https://github.com/rexescario-dev/resource-forge/issues/100) |
| RFC-030 | Relation→metadata projection (non-contribution closure; not an emitter RFC) | Accepted — [#102](https://github.com/rexescario-dev/resource-forge/issues/102) |

See [RFC process](rfc-process.md) and [RFC review checklist](rfc-review-checklist.md).

---

## M1 — Repository & workspace foundation

**Status:** Done

Monorepo layout, tooling, CI, placeholder packages, and documentation. No framework features.

---

## M2 — Core contracts

**Status:** Done

Establish the framework's **vocabulary**, not behavior. Deliverables live in `@resource-forge/core` as contracts and types — no runtime scanning or adapters.

### Deliverables

**Resource identity**

- What uniquely identifies a resource?
- Naming conventions
- Stable identifiers

**Metadata model**

- Immutable metadata objects
- Shared metadata primitives
- Extensible metadata without framework assumptions

**Registry contracts**

- Register resources
- Discover resources
- Query metadata
- Lifecycle kept intentionally minimal

**Extension points**

- Interfaces for transports
- Interfaces for persistence adapters
- Interfaces for metadata providers
- No implementations

### Non-goals

- Decorators
- Reflection
- Runtime scanning
- GraphQL
- Prisma
- NestJS

M2 defines the language of Resource Forge. It is gated by RFC-001–RFC-004.

---

## M3 — Resource model

**Status:** Done — [M3 implementation plan](superpowers/plans/2026-08-07-m3-implementation-plan.md) Accepted; [M3.1](superpowers/plans/2026-08-07-m3-1-resource-contracts.md) ✅; [M3.2](superpowers/plans/2026-08-08-m3-2-projection.md) ✅; [RFC-006](superpowers/specs/2026-08-08-rfc-006-annotations-design.md) Accepted; [M3.3 annotations](superpowers/plans/2026-08-08-m3-3-annotations.md) ✅ ([#10](https://github.com/rexescario-dev/resource-forge/issues/10)); [RFC-007](superpowers/specs/2026-08-08-rfc-007-resource-fields-design.md) Accepted; [M3.4 fields](superpowers/plans/2026-08-08-m3-4-fields.md) ✅ ([#15](https://github.com/rexescario-dev/resource-forge/issues/15)); [RFC-008](superpowers/specs/2026-08-08-rfc-008-resource-relations-design.md) Accepted ([#17](https://github.com/rexescario-dev/resource-forge/issues/17)); [M3.5 relations](superpowers/plans/2026-08-08-m3-5-relations.md) ✅ ([#19](https://github.com/rexescario-dev/resource-forge/issues/19)); [RFC-009](superpowers/specs/2026-08-08-rfc-009-resource-field-types-design.md) Accepted ([#21](https://github.com/rexescario-dev/resource-forge/issues/21)); [M3.6 Field Types](superpowers/plans/2026-08-08-m3-6-field-types.md) ✅ ([#23](https://github.com/rexescario-dev/resource-forge/issues/23)); [RFC-010](superpowers/specs/2026-08-08-rfc-010-relation-association-semantics-design.md) Accepted ([#26](https://github.com/rexescario-dev/resource-forge/issues/26)); [M3.7 relation association](superpowers/plans/2026-08-08-m3-7-relation-association.md) ✅ ([#28](https://github.com/rexescario-dev/resource-forge/issues/28)); [RFC-011](superpowers/specs/2026-08-08-rfc-011-relation-multiplicity-design.md) Accepted ([#31](https://github.com/rexescario-dev/resource-forge/issues/31)); [M3.8 relation multiplicity](superpowers/plans/2026-08-08-m3-8-relation-multiplicity.md) ✅ ([#33](https://github.com/rexescario-dev/resource-forge/issues/33)); [RFC-012](superpowers/specs/2026-08-08-rfc-012-resource-operations-design.md) Accepted ([#36](https://github.com/rexescario-dev/resource-forge/issues/36)); [M3.9 operations](superpowers/plans/2026-08-08-m3-9-operations.md) ✅ ([#38](https://github.com/rexescario-dev/resource-forge/issues/38)); [RFC-013](superpowers/specs/2026-08-08-rfc-013-field-relation-optionality-design.md) Accepted ([#40](https://github.com/rexescario-dev/resource-forge/issues/40)); [M3.10 Field/Relation Optionality](superpowers/plans/2026-08-08-m3-10-field-relation-optionality.md) ✅ ([#42](https://github.com/rexescario-dev/resource-forge/issues/42)); [RFC-014](superpowers/specs/2026-08-08-rfc-014-field-nullability-design.md) Accepted ([#46](https://github.com/rexescario-dev/resource-forge/issues/46)); [M3.11 Field Nullability](superpowers/plans/2026-08-08-m3-11-field-nullability.md) ✅ ([#48](https://github.com/rexescario-dev/resource-forge/issues/48)); [RFC-015](superpowers/specs/2026-08-08-rfc-015-relation-nullability-design.md) Accepted ([#51](https://github.com/rexescario-dev/resource-forge/issues/51)); [M3.12 Relation Nullability](superpowers/plans/2026-08-08-m3-12-relation-nullability.md) ✅ ([#53](https://github.com/rexescario-dev/resource-forge/issues/53)); [RFC-016](superpowers/specs/2026-08-08-rfc-016-constraints-design.md) Accepted ([#56](https://github.com/rexescario-dev/resource-forge/issues/56)); [M3.13 Constraints](superpowers/plans/2026-08-08-m3-13-constraints.md) ✅ ([#58](https://github.com/rexescario-dev/resource-forge/issues/58)); [RFC-017](superpowers/specs/2026-08-08-rfc-017-concrete-constraint-kinds-design.md) Accepted; [M3.14 Concrete Constraint Kinds](superpowers/plans/2026-08-08-m3-14-concrete-constraint-kinds.md) ✅ ([#63](https://github.com/rexescario-dev/resource-forge/issues/63)); [RFC-018](superpowers/specs/2026-08-08-rfc-018-runtime-constraint-enforcement-design.md) Accepted ([#66](https://github.com/rexescario-dev/resource-forge/issues/66)); [M3.15 Runtime Constraint Enforcement](superpowers/plans/2026-08-08-m3-15-runtime-constraint-enforcement.md) ✅ ([#67](https://github.com/rexescario-dev/resource-forge/issues/67)); [RFC-019](superpowers/specs/2026-08-08-rfc-019-uniqueness-cross-member-constraints-design.md) Accepted ([#70](https://github.com/rexescario-dev/resource-forge/issues/70)); [M3.16 Intra-Instance Cross-Member Constraints](superpowers/plans/2026-08-08-m3-16-cross-member-constraints.md) ✅ ([#72](https://github.com/rexescario-dev/resource-forge/issues/72)); [RFC-020](superpowers/specs/2026-08-09-rfc-020-population-uniqueness-design.md) Accepted ([#74](https://github.com/rexescario-dev/resource-forge/issues/74)); [M3.17 Population Uniqueness](superpowers/plans/2026-08-09-m3-17-population-uniqueness.md) ✅ ([#75](https://github.com/rexescario-dev/resource-forge/issues/75)); [RFC-021](superpowers/specs/2026-08-09-rfc-021-operation-kind-signature-execution-design.md) Accepted ([#77](https://github.com/rexescario-dev/resource-forge/issues/77)); [M3.18 Operation Kind / Signature / Execution](superpowers/plans/2026-08-09-m3-18-operation-kind-signature-execution.md) ✅ ([#78](https://github.com/rexescario-dev/resource-forge/issues/78)); [RFC-022](superpowers/specs/2026-08-09-rfc-022-annotation-vocabulary-design.md) Annotation Vocabulary **Accepted** ([#80](https://github.com/rexescario-dev/resource-forge/issues/80)); [M3.19 Annotation Vocabulary](superpowers/plans/2026-08-09-m3-19-annotation-vocabulary.md) ✅ ([#81](https://github.com/rexescario-dev/resource-forge/issues/81)); [RFC-023](superpowers/specs/2026-08-09-rfc-023-richer-projection-composition-design.md) Richer Projection — Composition Semantics **Accepted** ([#83](https://github.com/rexescario-dev/resource-forge/issues/83)); [M3.20 Projection Composition](superpowers/plans/2026-08-09-m3-20-projection-composition.md) ✅ ([#84](https://github.com/rexescario-dev/resource-forge/issues/84)); [RFC-024](superpowers/specs/2026-08-09-rfc-024-direction-joins-design.md) Direction / Joins **Accepted** ([#86](https://github.com/rexescario-dev/resource-forge/issues/86)); [M3.21 Direction / Joins](superpowers/plans/2026-08-09-m3-21-direction-joins.md) ✅ ([#87](https://github.com/rexescario-dev/resource-forge/issues/87)); [RFC-025](superpowers/specs/2026-08-09-rfc-025-value-state-semantics-design.md) Value-State Semantics **Accepted** ([#89](https://github.com/rexescario-dev/resource-forge/issues/89)); [M3.22 Value-State Semantics](superpowers/plans/2026-08-09-m3-22-value-state-semantics.md) ✅ ([#90](https://github.com/rexescario-dev/resource-forge/issues/90)); [RFC-026](superpowers/specs/2026-08-09-rfc-026-cascade-semantics-design.md) Cascade Semantics **Accepted** ([#92](https://github.com/rexescario-dev/resource-forge/issues/92)); [M3.23 Cascade Semantics](superpowers/plans/2026-08-09-m3-23-cascade-semantics.md) ✅ ([#93](https://github.com/rexescario-dev/resource-forge/issues/93)); [RFC-027](superpowers/specs/2026-08-09-rfc-027-loading-fetch-semantics-design.md) Loading / Fetch Semantics **Accepted** ([#95](https://github.com/rexescario-dev/resource-forge/issues/95)); [M3.24 Loading / Fetch](superpowers/plans/2026-08-09-m3-24-loading-fetch-semantics.md) ✅ ([#96](https://github.com/rexescario-dev/resource-forge/issues/96)). RFC-028 Persistence/ORM Mapping Accepted ([#98](https://github.com/rexescario-dev/resource-forge/issues/98)); [M3.25](superpowers/plans/2026-08-09-m3-25-persistence-orm-mapping.md) ✅. [RFC-029](superpowers/specs/2026-08-09-rfc-029-runtime-traversal-query-semantics-design.md) Runtime Traversal / Query Semantics **Accepted** ([#100](https://github.com/rexescario-dev/resource-forge/issues/100)); [M3.26](superpowers/plans/2026-08-09-m3-26-runtime-traversal-query.md) ✅. [RFC-030](superpowers/specs/2026-08-10-rfc-030-relation-metadata-projection-design.md) Relation→metadata projection (non-contribution closure) **Accepted** ([#102](https://github.com/rexescario-dev/resource-forge/issues/102)); [M3.27](superpowers/plans/2026-08-10-m3-27-relation-metadata-projection.md) ✅.

RFC-005 defines the authoritative Resource aggregate (`identity`, `schema`, `annotations`) and one-way projection to `ResourceMetadata`. RFC-006 defines the annotation container, validation, and direct projection participation. RFC-007 defines the ordered `fields` sequence and `FieldName` (Field shape amended by RFC-009 / RFC-013 / RFC-014). RFC-008 defines the ordered `relations` sequence and `RelationName` (Relation shape amended by RFC-010 / RFC-011 / RFC-013 / RFC-015). RFC-009 requires closed typed Fields with `FieldType` ∈ {string, number, boolean}. RFC-010 requires closed associated Relations with declarative `ResourceIdentity` targets under RFC-001 `user` context. RFC-011 requires closed `multiplicity: "one"|"many"` on every Relation (relationship shape only). RFC-012 defines the name-only Operations declaration floor. RFC-013 requires closed `optional: boolean` on every Field and Relation (schema-declaration presence only). RFC-014 requires closed `nullable: boolean` on every Field (value-nullability declaration constraints only; orthogonal to `optional`). RFC-015 requires closed association-reference `nullable: boolean` on every Relation (orthogonal to `optional` and `multiplicity`; Fields unchanged at RFC-014). RFC-016 adds a required ordered `constraints` sequence of closed `{ name, kind }` members (open non-empty `kind`; framework floor only). RFC-017 specializes that floor to closed exclusive `ConstraintKind = "range" | "pattern" | "enum"` with Field-targeted kind-discriminated declaration shapes and declaration-time resolve/type-match. RFC-018 adds runtime evaluation of those declared Constraints against a field-value map (inclusive `range`, ECMAScript full-string `pattern`, `enum` membership, per-Constraint optional/nullable/type gates; fail-fast). RFC-019 extends the closed kind vocabulary with intra-instance cross-member `distinct` / `equal` (multi-field `fields`; same field-value map; population uniqueness deferred). [RFC-020](superpowers/specs/2026-08-09-rfc-020-population-uniqueness-design.md) (Accepted — [#74](https://github.com/rexescario-dev/resource-forge/issues/74)) adds closed `unique` with a separate population surface and Constraint-scoped occupancy provider; `checkConstraintValues` remains intra-instance and skips `unique`. [RFC-021](superpowers/specs/2026-08-09-rfc-021-operation-kind-signature-execution-design.md) (Accepted — [#77](https://github.com/rexescario-dev/resource-forge/issues/77)) amends Operations with closed `command`|`query`, scalar params, and a thin host invocation contract (`void` = no semantic result payload). [RFC-022](superpowers/specs/2026-08-09-rfc-022-annotation-vocabulary-design.md) (Accepted — [#80](https://github.com/rexescario-dev/resource-forge/issues/80)) defines a closed annotation-scoped `rf` vocabulary (`description` \| `displayName`) with string value shapes while retaining RFC-006 direct projection. [RFC-023](superpowers/specs/2026-08-09-rfc-023-richer-projection-composition-design.md) (Accepted — [#83](https://github.com/rexescario-dev/resource-forge/issues/83)) defines multi-source projection composition as disjoint union with hard `MetadataKey` collision failure (annotations remain the sole concrete source; no new emitters). [RFC-024](superpowers/specs/2026-08-09-rfc-024-direction-joins-design.md) (Accepted — [#86](https://github.com/rexescario-dev/resource-forge/issues/86)) widens Relations with required `direction`, optional reverse-edge `inverse`, and optional `{ local, remote }` `join` (declarative traversal identity only). [RFC-025](superpowers/specs/2026-08-09-rfc-025-value-state-semantics-design.md) (Accepted — [#89](https://github.com/rexescario-dev/resource-forge/issues/89)) locks Field/Relation value-state semantics (`empty ≠ absent`, `empty ≢` association null; null elements forbidden; association null via RFC-015 only).

Suggested implementation slices (see M3 implementation plan):

- **M3.1** — Resource / ResourceSchema contracts, minimal construction, validation ✅
- **M3.2** — `projectResourceMetadata` (RFC-005 floor only) ✅
- **M3.3** — Annotations per RFC-006 (container + validation + direct projection) ✅
- **M3.4** — Fields per RFC-007 (member + ordered sequence + validation) ✅ — [#15](https://github.com/rexescario-dev/resource-forge/issues/15)
- **M3.5** — Relations per RFC-008 (member + ordered sequence + validation) ✅ — [#19](https://github.com/rexescario-dev/resource-forge/issues/19)
- **M3.6** — Field Types per RFC-009 (required `{ name, type }` + closed `FieldType`) ✅ — [#23](https://github.com/rexescario-dev/resource-forge/issues/23)
- **M3.7** — Relation Association per RFC-010 (required `{ name, target }`) ✅ — [#28](https://github.com/rexescario-dev/resource-forge/issues/28)
- **M3.8** — Relation Multiplicity per RFC-011 (required `{ name, target, multiplicity }`) ✅ — [#33](https://github.com/rexescario-dev/resource-forge/issues/33)
- **M3.9** — Operations per RFC-012 (name-only Operation + ordered sequence) ✅ — [#38](https://github.com/rexescario-dev/resource-forge/issues/38)  
- **M3.10** — Field/Relation Optionality per RFC-013 (required `optional: boolean`) ✅ — [#42](https://github.com/rexescario-dev/resource-forge/issues/42)
- **M3.11** — Field Nullability per RFC-014 (required `nullable: boolean` on Field) ✅ — [#48](https://github.com/rexescario-dev/resource-forge/issues/48)
- **M3.12** — Relation Nullability per RFC-015 (required association-reference `nullable: boolean` on Relation) ✅ — [#53](https://github.com/rexescario-dev/resource-forge/issues/53)
- **M3.13** — Constraints framework per RFC-016 (required ordered `constraints` + closed `{ name, kind }`) ✅ — [#58](https://github.com/rexescario-dev/resource-forge/issues/58)
- **M3.14** — Concrete Constraint Kinds per RFC-017 (closed `range` \| `pattern` \| `enum`; Field-targeted; declaration-time only) ✅ — [#63](https://github.com/rexescario-dev/resource-forge/issues/63)
- **M3.15** — Runtime Constraint Enforcement per RFC-018 (field-value map; inclusive `range`; ECMAScript `pattern`; `enum` membership; optional/nullable gates) ✅ — [#67](https://github.com/rexescario-dev/resource-forge/issues/67)
- **M3.16** — Intra-Instance Cross-Member Constraints per RFC-019 (`distinct` \| `equal`; multi-field `fields`; gate-order; same field-value map) ✅ — [#72](https://github.com/rexescario-dev/resource-forge/issues/72)
- **M3.17** — Population Uniqueness per RFC-020 (closed `unique`; Constraint-scoped occupancy provider; `checkConstraintValues` skips `unique`) ✅ — [#75](https://github.com/rexescario-dev/resource-forge/issues/75)
- **M3.18** — Operation Kind / Signature / Execution per RFC-021 (closed `command`\|`query`; scalar params; thin host invoke) ✅ — [#78](https://github.com/rexescario-dev/resource-forge/issues/78)
- **M3.19** — Annotation Vocabulary per RFC-022 (closed annotation-scoped `rf` catalog: `description`\|`displayName`; string value shapes) ✅ — [#81](https://github.com/rexescario-dev/resource-forge/issues/81)
- **M3.20** — Projection Composition per RFC-023 (disjoint-union composition; hard `MetadataKey` collision; annotations sole concrete source) ✅ — [#84](https://github.com/rexescario-dev/resource-forge/issues/84)
- **M3.21** — Direction / Joins per RFC-024 (required `direction`; optional `inverse` + `{ local, remote }` `join`; multi-Resource resolve) ✅ — [#87](https://github.com/rexescario-dev/resource-forge/issues/87)
- **M3.22** — Value-State Semantics per RFC-025 (`checkFieldValueStates` / `checkRelationValueStates`; empty≠absent; null elements forbidden) ✅ — [#90](https://github.com/rexescario-dev/resource-forge/issues/90)
- **M3.23** — Cascade Semantics per RFC-026 (required `onDelete` / `onUpdate`; `evaluateCascadeEvent`; setNull⇒nullable; presence-symmetric restrict) ✅ — [#93](https://github.com/rexescario-dev/resource-forge/issues/93)
- **M3.24** — Loading / Fetch Semantics per RFC-027 (required `fetch: eager|lazy`; `checkRelationLoadStates`; not-loaded ≠ value state) ✅ — [#96](https://github.com/rexescario-dev/resource-forge/issues/96)
- **M3.25** — Persistence / ORM Mapping per RFC-028 (docs/verification closeout; no core persistence API) ✅ — [#98](https://github.com/rexescario-dev/resource-forge/issues/98)
- **M3.26** — Runtime Traversal / Query Semantics per RFC-029 (docs/verification closeout; no core navigation/query API) ✅ — [#100](https://github.com/rexescario-dev/resource-forge/issues/100)
- **M3.27** — Relation → Metadata Projection per RFC-030 (docs/verification closeout; non-contribution closure; no Relation emitter) ✅ — [#102](https://github.com/rexescario-dev/resource-forge/issues/102)

Still transport-agnostic; no Nest / GraphQL / Prisma work in M3.

**Closeout:** M3 Resource model is complete for its stated scope (RFC-005–RFC-030; M3.1–M3.27). Deferred metadata emitters (including Field → metadata, Operation → metadata, and any future Relation-metadata emitter beyond RFC-030’s non-contribution lock) remain **future RFC candidates** and do **not** reopen M3.

---

## M4 — Integrations

**Status:** In progress — [M4.1 Nest](superpowers/plans/2026-08-10-m4-1-nest-discovery-host.md) ✅ ([RFC-031](superpowers/specs/2026-08-10-rfc-031-nest-discovery-host-integration-design.md) — [#106](https://github.com/rexescario-dev/resource-forge/issues/106)); [M4.2 GraphQL](superpowers/plans/2026-08-10-m4-2-graphql-schema-resolver-generation.md) ✅ ([RFC-032](superpowers/specs/2026-08-10-rfc-032-graphql-schema-resolver-generation-design.md) — [#109](https://github.com/rexescario-dev/resource-forge/issues/109)); [M4.3.1 Prisma correspondence](superpowers/plans/2026-08-10-m4-3-prisma-correspondence-verification.md) ✅ ([RFC-033](superpowers/specs/2026-08-10-rfc-033-prisma-correspondence-verification-design.md) — [#112](https://github.com/rexescario-dev/resource-forge/issues/112)); [M4.3.2 schema realization](superpowers/plans/2026-08-10-m4-3-2-prisma-schema-realization.md) ✅ ([RFC-034](superpowers/specs/2026-08-10-rfc-034-prisma-schema-realization-design.md) — [#115](https://github.com/rexescario-dev/resource-forge/issues/115)); [M4.3.3 Client bindings](superpowers/plans/2026-08-10-m4-3-3-prisma-client-bindings.md) ✅ ([RFC-035](superpowers/specs/2026-08-10-rfc-035-prisma-client-bindings-design.md) — [#118](https://github.com/rexescario-dev/resource-forge/issues/118)).

Only after the core model is stable. Each adapter depends only on `@resource-forge/core`. Suggested order:

1. **M4.1 Nest** — host the framework; discovery; DI; module registration (RFC-031) ✅ — [#106](https://github.com/rexescario-dev/resource-forge/issues/106)
2. **M4.2 GraphQL** — translate resource model into GraphQL; schema and resolver generation (RFC-032) ✅ — [#109](https://github.com/rexescario-dev/resource-forge/issues/109)
3. **M4.3 Prisma** — Resource→Prisma correspondence verification (M4.3.1 / RFC-033) ✅ — [#112](https://github.com/rexescario-dev/resource-forge/issues/112); schema realization (M4.3.2 / RFC-034) ✅ — [#115](https://github.com/rexescario-dev/resource-forge/issues/115); Client bindings (M4.3.3 / RFC-035) ✅ — [#118](https://github.com/rexescario-dev/resource-forge/issues/118)

Integrations remain independent of each other. Do not expand RFC-028 into Prisma/ORM realization under M4.1.

---

## M5 — CLI & examples

**Status:** In progress — [M5.1 CLI Foundation](superpowers/plans/2026-08-10-m5-1-cli-foundation.md) ✅ ([RFC-036](superpowers/specs/2026-08-10-rfc-036-cli-foundation-design.md) — [#121](https://github.com/rexescario-dev/resource-forge/issues/121)); [M5.2 CLI Resource Validation](superpowers/plans/2026-08-10-m5-2-cli-resource-validation.md) ✅ ([RFC-037](superpowers/specs/2026-08-10-rfc-037-cli-resource-validation-design.md) — [#124](https://github.com/rexescario-dev/resource-forge/issues/124) / [#126](https://github.com/rexescario-dev/resource-forge/pull/126)); [M5.3 CLI Package Environment Doctor](superpowers/specs/2026-08-10-rfc-038-cli-package-environment-doctor-design.md) Accepted ([RFC-038](superpowers/specs/2026-08-10-rfc-038-cli-package-environment-doctor-design.md) — [#128](https://github.com/rexescario-dev/resource-forge/issues/128)).

Developer experience after the ecosystem exists.

1. **M5.1 CLI Foundation** — `rf` executable shell + pure `run(argv)` (RFC-036) ✅ — [#121](https://github.com/rexescario-dev/resource-forge/issues/121) / [#122](https://github.com/rexescario-dev/resource-forge/pull/122)
2. **M5.2 CLI Resource Validation** — thin `rf validate <file>` over core `validateResource` (RFC-037) ✅ — [#124](https://github.com/rexescario-dev/resource-forge/issues/124) / [#126](https://github.com/rexescario-dev/resource-forge/pull/126)
3. **M5.3 CLI Package Environment Doctor** — `rf doctor` CLI/package health (RFC-038) Accepted — [#128](https://github.com/rexescario-dev/resource-forge/issues/128)
4. **Later slices (not committed APIs)** — generators, examples, project/workspace doctor, and reverse Prisma generation only after their own Accepted designs

Roadmap candidates that are **not** committed APIs until Accepted:

```text
rf init
rf generate resource
rf generate from-prisma
```

`rf validate` is locked by Accepted RFC-037 (`#124`). `rf doctor` is locked by Accepted RFC-038 (`#128`); delivery ✅ only after M5–M10 closeout.

Examples demonstrate the framework end to end. They are not the source of truth for architecture.
