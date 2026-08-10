/**
 * Emit-side Prisma realization mapping (RFC-034 §4).
 * Distinct from RFC-033 PrismaResourceMapping (names only) except where
 * §4.7 requires semantic identity for correspondence-relevant name decisions.
 */

export type IdentityDefaultKind = 'cuid' | 'uuid' | 'autoincrement';

export type PrismaIdentityScalar = 'String' | 'Int';

export type ResourceFieldIdentity = {
  readonly kind: 'resourceField';
  readonly field: string;
  readonly default?: IdentityDefaultKind;
};

export type PrismaExtraIdentity = {
  readonly kind: 'prismaExtra';
  readonly name: string;
  readonly scalar: PrismaIdentityScalar;
  readonly default?: IdentityDefaultKind;
};

export type InstanceIdentity = ResourceFieldIdentity | PrismaExtraIdentity;

export type NumberOverlayScalar = 'Int' | 'Float' | 'Decimal';

/**
 * Host join overlay when Resource `join` is absent (RFC-034 §4.3).
 * Identifies the FK-owning Relation and local/remote participants.
 */
export type JoinOverlay = {
  /** Resource identity key `namespace/name` of the FK-owning Relation's Resource */
  readonly owningResourceKey: string;
  /** Relation.name on the owning Resource */
  readonly owningRelation: string;
  /** Local Resource Field name on the owning Resource */
  readonly local: string;
  /**
   * Remote participant:
   * - string → Resource Field name on the target (must be target's resourceField identity)
   * - `{ prismaExtra: true }` → target's declared prismaExtra instance-identity `@id`
   */
  readonly remote: string | { readonly prismaExtra: true };
};

export type PrismaRealizationMapping = {
  /**
   * Required per Resource identity key (`namespace/name`).
   */
  readonly identities: Readonly<Record<string, InstanceIdentity>>;
  readonly numberOverlays?: Readonly<
    Record<string, Readonly<Record<string, NumberOverlayScalar>>>
  >;
  readonly joinOverlays?: Readonly<
    Record<string, Readonly<Record<string, JoinOverlay>>>
  >;
  /** Optional Prisma model name overrides (identity key → model name) */
  readonly models?: Readonly<Record<string, string>>;
  readonly fields?: Readonly<
    Record<string, Readonly<Record<string, string>>>
  >;
  readonly relations?: Readonly<
    Record<string, Readonly<Record<string, string>>>
  >;
};

export type EmitOptions = {
  /** Host composition only; must not affect correspondence (RFC-034 §4.6) */
  readonly preamble?: string;
};

export type EmitSuccess = {
  /** Prisma model-block SDL derived from the Emit Model */
  readonly models: string;
  readonly preamble?: string;
  /** Package-defined DMMF-shaped document */
  readonly dmmf: {
    readonly datamodel: {
      readonly models: readonly Record<string, unknown>[];
    };
  };
};
