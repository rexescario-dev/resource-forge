/**
 * Compile-time structural port for a Prisma-compatible model delegate (RFC-035 §3.3).
 * Argument shapes are Prisma-shaped internally only — not a public API.
 * Methods MAY return Promises; rejection becomes delegate_failed.
 */
export type StructuralModelDelegate = {
  readonly create: (args: { readonly data: Record<string, unknown> }) => unknown;
  readonly findUnique: (args: {
    readonly where: Record<string, unknown>;
  }) => unknown;
  readonly update: (args: {
    readonly where: Record<string, unknown>;
    readonly data: Record<string, unknown>;
  }) => unknown;
  readonly delete: (args: {
    readonly where: Record<string, unknown>;
  }) => unknown;
};
