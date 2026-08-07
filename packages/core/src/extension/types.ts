import type { IdentityValidationError } from '../identity/types.js';
import type {
  JsonValue,
  JsonValueValidationError,
  MetadataKeyValidationError,
} from '../metadata/types.js';

export type ProducerKind = 'framework' | 'extension';

export type ContributionEntry = {
  readonly name: string;
  readonly value: JsonValue;
};

export type NamespacePartition = {
  readonly namespace: string;
  readonly entries: ReadonlyArray<ContributionEntry>;
};

export type Contribution = {
  readonly kind: ProducerKind;
  readonly partitions: ReadonlyArray<NamespacePartition>;
};

export type ContributionValidationError =
  | {
      readonly code: 'invalid_kind';
      readonly kind: unknown;
    }
  | {
      readonly code: 'duplicate_partition_namespace';
      readonly namespace: string;
      readonly partitionIndices: ReadonlyArray<number>;
    }
  | {
      readonly code: 'duplicate_entry_name';
      readonly name: string;
      readonly entryIndices: ReadonlyArray<number>;
    }
  | {
      readonly code: 'invalid_key';
      readonly entryIndex?: number;
      readonly cause: MetadataKeyValidationError;
    }
  | {
      readonly code: 'invalid_json_value';
      readonly entryIndex: number;
      readonly cause: JsonValueValidationError;
    };

export type CompositionError =
  | {
      readonly code: 'invalid_identity';
      readonly cause: IdentityValidationError;
    }
  | {
      readonly code: 'invalid_contribution';
      readonly contributionIndex: number;
      readonly partitionIndex?: number;
      readonly cause: ContributionValidationError;
    }
  | {
      readonly code: 'reserved_namespace_violation';
      readonly contributionIndex: number;
      readonly partitionIndex: number;
    }
  | {
      readonly code: 'duplicate_namespace';
      readonly namespace: string;
      readonly contributionIndices: ReadonlyArray<number>;
    };
