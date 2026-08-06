export type ResourceIdentity = {
  readonly namespace: string;
  readonly name: string;
};

export type ResourceIdentityKind = 'user' | 'framework';

export type IdentityValidationError =
  | { readonly code: 'invalid_namespace'; readonly namespace: string }
  | { readonly code: 'invalid_name'; readonly name: string }
  | { readonly code: 'reserved_namespace'; readonly namespace: string };
