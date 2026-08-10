import { describe, expect, it } from 'vitest';
import { synthesizeResourcesFromDmmf } from './bootstrap-from-dmmf.js';

function dmmf(models: readonly unknown[]) {
  return { datamodel: { models: [...models] } };
}

function model(name: string, fields: readonly Record<string, unknown>[]) {
  return { name, fields: [...fields] };
}

function scalar(
  name: string,
  type: string,
  isRequired: boolean,
  extra: Record<string, unknown> = {},
) {
  return {
    name,
    kind: 'scalar',
    type,
    isList: false,
    isRequired,
    ...extra,
  };
}

function relation(
  name: string,
  type: string,
  opts: {
    isList: boolean;
    isRequired: boolean;
    relationFromFields?: readonly string[];
    relationToFields?: readonly string[];
    relationName?: string | null;
  },
) {
  return {
    name,
    kind: 'object',
    type,
    isList: opts.isList,
    isRequired: opts.isRequired,
    relationFromFields: opts.relationFromFields ?? [],
    relationToFields: opts.relationToFields ?? [],
    relationName: opts.relationName === undefined ? null : opts.relationName,
  };
}

describe('synthesizeResourcesFromDmmf profile', () => {
  it('rejects missing datamodel.models as API error', () => {
    const result = synthesizeResourcesFromDmmf({
      dmmf: {},
      namespace: 'crm',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('unusable_dmmf');
  });

  it('rejects missing isList as API error', () => {
    const result = synthesizeResourcesFromDmmf({
      dmmf: dmmf([
        model('User', [
          {
            name: 'id',
            kind: 'scalar',
            type: 'Int',
            isRequired: true,
          },
        ]),
      ]),
      namespace: 'crm',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('unusable_dmmf');
  });

  it('rejects object field missing relationName as API error', () => {
    const result = synthesizeResourcesFromDmmf({
      dmmf: dmmf([
        model('User', [
          {
            name: 'posts',
            kind: 'object',
            type: 'Post',
            isList: true,
            isRequired: true,
            relationFromFields: [],
            relationToFields: [],
          },
        ]),
        model('Post', [scalar('id', 'Int', true)]),
      ]),
      namespace: 'crm',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('unusable_dmmf');
  });

  it('rejects duplicate model names as API error', () => {
    const result = synthesizeResourcesFromDmmf({
      dmmf: dmmf([
        model('User', [scalar('id', 'Int', true)]),
        model('User', [scalar('id', 'Int', true)]),
      ]),
      namespace: 'crm',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('unusable_dmmf');
  });

  it('rejects duplicate field names as API error', () => {
    const result = synthesizeResourcesFromDmmf({
      dmmf: dmmf([
        model('User', [scalar('id', 'Int', true), scalar('id', 'String', true)]),
      ]),
      namespace: 'crm',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('unusable_dmmf');
  });

  it('rejects path-unsafe model names as API error', () => {
    for (const name of ['../x', '.', '..', 'bad-name', '']) {
      const result = synthesizeResourcesFromDmmf({
        dmmf: dmmf([model(name || ' ', [scalar('id', 'Int', true)])]),
        namespace: 'crm',
      });
      expect(result.ok).toBe(false);
    }
  });

  it('rejects empty/invalid namespace as API error', () => {
    const empty = synthesizeResourcesFromDmmf({
      dmmf: dmmf([model('User', [scalar('id', 'Int', true)])]),
      namespace: '',
    });
    expect(empty.ok).toBe(false);
    if (!empty.ok) expect(empty.error.code).toBe('invalid_namespace');

    const bad = synthesizeResourcesFromDmmf({
      dmmf: dmmf([model('User', [scalar('id', 'Int', true)])]),
      namespace: 'CRM',
    });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error.code).toBe('invalid_namespace');
  });
});

describe('synthesizeResourcesFromDmmf mapping', () => {
  it('maps allow-listed scalars including Float/Decimal→number', () => {
    const result = synthesizeResourcesFromDmmf({
      dmmf: dmmf([
        model('Item', [
          scalar('id', 'Int', true),
          scalar('name', 'String', true),
          scalar('ok', 'Boolean', true),
          scalar('price', 'Float', true),
          scalar('amount', 'Decimal', false),
        ]),
      ]),
      namespace: 'crm',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.refusals).toEqual([]);
    expect(result.value.emissions).toHaveLength(1);
    const resource = result.value.emissions[0]!.resource;
    expect(resource.identity).toEqual({ namespace: 'crm', name: 'Item' });
    expect(resource.schema.fields.map((f) => f.type)).toEqual([
      'number',
      'string',
      'boolean',
      'number',
      'number',
    ]);
    expect(resource.schema.fields[4]).toMatchObject({
      name: 'amount',
      optional: true,
      nullable: true,
    });
  });

  it('refuses unsupported scalars and scalar lists', () => {
    const dt = synthesizeResourcesFromDmmf({
      dmmf: dmmf([
        model('Post', [
          scalar('id', 'Int', true),
          scalar('createdAt', 'DateTime', true),
        ]),
      ]),
      namespace: 'crm',
    });
    expect(dt.ok).toBe(true);
    if (!dt.ok) return;
    expect(dt.value.emissions).toHaveLength(0);
    expect(dt.value.refusals[0]).toMatchObject({
      model: 'Post',
      code: 'unsupported_field',
      member: 'createdAt',
    });

    const list = synthesizeResourcesFromDmmf({
      dmmf: dmmf([
        model('Tag', [
          {
            name: 'labels',
            kind: 'scalar',
            type: 'String',
            isList: true,
            isRequired: true,
          },
        ]),
      ]),
      namespace: 'crm',
    });
    expect(list.ok).toBe(true);
    if (!list.ok) return;
    expect(list.value.refusals[0]?.code).toBe('unsupported_field');
  });

  it('refuses unsupported kinds', () => {
    const result = synthesizeResourcesFromDmmf({
      dmmf: dmmf([
        model('User', [
          scalar('id', 'Int', true),
          {
            name: 'role',
            kind: 'enum',
            type: 'Role',
            isList: false,
            isRequired: true,
          },
        ]),
      ]),
      namespace: 'crm',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.refusals[0]).toMatchObject({
      model: 'User',
      code: 'unsupported_field',
      member: 'role',
    });
  });

  it('maps 1:n with FK scalars retained and join absent', () => {
    const result = synthesizeResourcesFromDmmf({
      dmmf: dmmf([
        model('User', [
          scalar('id', 'Int', true),
          relation('posts', 'Post', {
            isList: true,
            isRequired: true,
            relationName: 'UserPosts',
          }),
        ]),
        model('Post', [
          scalar('id', 'Int', true),
          scalar('authorId', 'Int', true),
          relation('author', 'User', {
            isList: false,
            isRequired: true,
            relationFromFields: ['authorId'],
            relationToFields: ['id'],
            relationName: 'UserPosts',
          }),
        ]),
      ]),
      namespace: 'crm',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.refusals).toEqual([]);
    const user = result.value.emissions.find((e) => e.model === 'User')!;
    const post = result.value.emissions.find((e) => e.model === 'Post')!;
    expect(post.resource.schema.fields.map((f) => f.name)).toEqual([
      'id',
      'authorId',
    ]);
    const postsRel = user.resource.schema.relations[0]!;
    expect(postsRel).toMatchObject({
      name: 'posts',
      multiplicity: 'many',
      nullable: false,
      optional: false,
      direction: 'outbound',
      onDelete: 'none',
      fetch: 'lazy',
      inverse: 'author',
    });
    expect(postsRel).not.toHaveProperty('join');
    expect(post.resource.schema.relations[0]).toMatchObject({
      inverse: 'posts',
      multiplicity: 'one',
    });
  });

  it('list relation ignores isRequired for nullability', () => {
    const result = synthesizeResourcesFromDmmf({
      dmmf: dmmf([
        model('User', [
          scalar('id', 'Int', true),
          relation('posts', 'Post', {
            isList: true,
            isRequired: false,
            relationName: null,
          }),
        ]),
        model('Post', [scalar('id', 'Int', true)]),
      ]),
      namespace: 'crm',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.emissions[0]!.resource.schema.relations[0]).toMatchObject(
      {
        nullable: false,
        optional: false,
      },
    );
  });

  it('refuses self-relations and implicit m:n', () => {
    const self = synthesizeResourcesFromDmmf({
      dmmf: dmmf([
        model('Node', [
          scalar('id', 'Int', true),
          relation('parent', 'Node', {
            isList: false,
            isRequired: false,
            relationName: 'Tree',
          }),
        ]),
      ]),
      namespace: 'crm',
    });
    expect(self.ok).toBe(true);
    if (!self.ok) return;
    expect(self.value.refusals[0]?.code).toBe('unsupported_relation');

    const mn = synthesizeResourcesFromDmmf({
      dmmf: dmmf([
        model('Post', [
          scalar('id', 'Int', true),
          relation('tags', 'Tag', {
            isList: true,
            isRequired: true,
            relationFromFields: [],
            relationName: 'PostTags',
          }),
        ]),
        model('Tag', [
          scalar('id', 'Int', true),
          relation('posts', 'Post', {
            isList: true,
            isRequired: true,
            relationFromFields: [],
            relationName: 'PostTags',
          }),
        ]),
      ]),
      namespace: 'crm',
    });
    expect(mn.ok).toBe(true);
    if (!mn.ok) return;
    expect(mn.value.emissions).toHaveLength(0);
    expect(mn.value.refusals.map((r) => r.model).sort()).toEqual([
      'Post',
      'Tag',
    ]);
  });

  it('allows source emit when target is independently refused', () => {
    const result = synthesizeResourcesFromDmmf({
      dmmf: dmmf([
        model('User', [
          scalar('id', 'Int', true),
          relation('posts', 'Post', {
            isList: true,
            isRequired: true,
            relationName: null,
          }),
        ]),
        model('Post', [
          scalar('id', 'Int', true),
          scalar('createdAt', 'DateTime', true),
        ]),
      ]),
      namespace: 'crm',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.emissions.map((e) => e.model)).toEqual(['User']);
    expect(result.value.refusals.map((r) => r.model)).toEqual(['Post']);
  });

  it('refuses missing related model', () => {
    const result = synthesizeResourcesFromDmmf({
      dmmf: dmmf([
        model('User', [
          scalar('id', 'Int', true),
          relation('posts', 'Missing', {
            isList: true,
            isRequired: true,
            relationName: null,
          }),
        ]),
      ]),
      namespace: 'crm',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.refusals[0]).toMatchObject({
      code: 'unsupported_relation',
      member: 'posts',
    });
  });

  it('resolves inverse cases per §5.2.5', () => {
    const equalName = synthesizeResourcesFromDmmf({
      dmmf: dmmf([
        model('A', [
          scalar('id', 'Int', true),
          relation('bs', 'B', {
            isList: true,
            isRequired: true,
            relationName: 'AB',
          }),
        ]),
        model('B', [
          scalar('id', 'Int', true),
          relation('a', 'A', {
            isList: false,
            isRequired: true,
            relationFromFields: ['aId'],
            relationToFields: ['id'],
            relationName: 'AB',
          }),
          scalar('aId', 'Int', true),
        ]),
      ]),
      namespace: 'crm',
    });
    expect(equalName.ok).toBe(true);
    if (!equalName.ok) return;
    expect(
      equalName.value.emissions.find((e) => e.model === 'A')!.resource.schema
        .relations[0]!.inverse,
    ).toBe('a');

    const unequal = synthesizeResourcesFromDmmf({
      dmmf: dmmf([
        model('A', [
          scalar('id', 'Int', true),
          relation('bs', 'B', {
            isList: true,
            isRequired: true,
            relationName: 'Left',
          }),
        ]),
        model('B', [
          scalar('id', 'Int', true),
          relation('a', 'A', {
            isList: false,
            isRequired: true,
            relationName: 'Right',
          }),
        ]),
      ]),
      namespace: 'crm',
    });
    expect(unequal.ok).toBe(true);
    if (!unequal.ok) return;
    expect(
      unequal.value.emissions.find((e) => e.model === 'A')!.resource.schema
        .relations[0]!,
    ).not.toHaveProperty('inverse');

    const uniqueNull = synthesizeResourcesFromDmmf({
      dmmf: dmmf([
        model('A', [
          scalar('id', 'Int', true),
          relation('bs', 'B', {
            isList: true,
            isRequired: true,
            relationName: null,
          }),
        ]),
        model('B', [
          scalar('id', 'Int', true),
          relation('a', 'A', {
            isList: false,
            isRequired: true,
            relationName: null,
          }),
        ]),
      ]),
      namespace: 'crm',
    });
    expect(uniqueNull.ok).toBe(true);
    if (!uniqueNull.ok) return;
    expect(
      uniqueNull.value.emissions.find((e) => e.model === 'A')!.resource.schema
        .relations[0]!.inverse,
    ).toBe('a');

    const ambiguous = synthesizeResourcesFromDmmf({
      dmmf: dmmf([
        model('A', [
          scalar('id', 'Int', true),
          relation('bs', 'B', {
            isList: true,
            isRequired: true,
            relationName: null,
          }),
        ]),
        model('B', [
          scalar('id', 'Int', true),
          relation('a1', 'A', {
            isList: false,
            isRequired: false,
            relationName: null,
          }),
          relation('a2', 'A', {
            isList: false,
            isRequired: false,
            relationName: null,
          }),
        ]),
      ]),
      namespace: 'crm',
    });
    expect(ambiguous.ok).toBe(true);
    if (!ambiguous.ok) return;
    expect(
      ambiguous.value.emissions.find((e) => e.model === 'A')!.resource.schema
        .relations[0]!,
    ).not.toHaveProperty('inverse');

    const noBack = synthesizeResourcesFromDmmf({
      dmmf: dmmf([
        model('A', [
          scalar('id', 'Int', true),
          relation('bs', 'B', {
            isList: true,
            isRequired: true,
            relationName: null,
          }),
        ]),
        model('B', [scalar('id', 'Int', true)]),
      ]),
      namespace: 'crm',
    });
    expect(noBack.ok).toBe(true);
    if (!noBack.ok) return;
    expect(
      noBack.value.emissions.find((e) => e.model === 'A')!.resource.schema
        .relations[0]!,
    ).not.toHaveProperty('inverse');
  });

  it('uses schema field name and ignores dbName', () => {
    const result = synthesizeResourcesFromDmmf({
      dmmf: dmmf([
        model('User', [
          scalar('displayName', 'String', true, { dbName: 'display_name' }),
        ]),
      ]),
      namespace: 'crm',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.emissions[0]!.resource.schema.fields[0]!.name).toBe(
      'displayName',
    );
  });

  it('preserves fields array order and model∈exactly-one', () => {
    const result = synthesizeResourcesFromDmmf({
      dmmf: dmmf([
        model('User', [
          scalar('b', 'String', true),
          scalar('a', 'String', true),
        ]),
        model('Post', [scalar('createdAt', 'DateTime', true)]),
      ]),
      namespace: 'crm',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(
      result.value.emissions[0]!.resource.schema.fields.map((f) => f.name),
    ).toEqual(['b', 'a']);
    const models = new Set([
      ...result.value.emissions.map((e) => e.model),
      ...result.value.refusals.map((r) => r.model),
    ]);
    expect(models.size).toBe(
      result.value.emissions.length + result.value.refusals.length,
    );
  });
});
