import type { ResourceIdentity } from '@resource-forge/core';

export type ResourceCorrespondence = {
  readonly resourceIdentity: ResourceIdentity;
  readonly prismaModelName: string;
};

export type FieldCorrespondence = {
  readonly resourceIdentity: ResourceIdentity;
  readonly fieldName: string;
  readonly prismaFieldName: string;
  readonly prismaScalarType: string;
};

export type RelationCorrespondence = {
  readonly resourceIdentity: ResourceIdentity;
  readonly relationName: string;
  readonly prismaRelationName: string;
  readonly targetIdentity: ResourceIdentity;
  readonly prismaTargetModelName: string;
  readonly multiplicity: 'one' | 'many';
};

export type CorrespondenceReport = {
  readonly resources: readonly ResourceCorrespondence[];
  readonly fields: readonly FieldCorrespondence[];
  readonly relations: readonly RelationCorrespondence[];
};
