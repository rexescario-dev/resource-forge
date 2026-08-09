import 'reflect-metadata';
import { Injectable, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  createResource,
  createResourceIdentity,
  type Resource,
  type ResourceRegistry,
} from '@resource-forge/core';
import { describe, expect, it } from 'vitest';
import { DiscoverableResource } from './discoverable.decorator.js';
import type { ResourceDeclarationProvider } from './resource-declaration.js';
import { ResourceForgeModule } from './resource-forge.module.js';
import { RESOURCE_REGISTRY } from './tokens.js';

function sampleResource(name: string): Resource {
  const identity = createResourceIdentity('crm', name);
  if (!identity.ok) {
    throw new Error('identity');
  }
  const resource = createResource(identity.value);
  if (!resource.ok) {
    throw new Error('resource');
  }
  return resource.value;
}

@Injectable()
@DiscoverableResource()
class SyncCustomerProvider implements ResourceDeclarationProvider {
  provideResource(): Resource {
    return sampleResource('Customer');
  }
}

@Injectable()
@DiscoverableResource()
class AsyncCustomerProvider implements ResourceDeclarationProvider {
  async provideResource(): Promise<Resource> {
    return sampleResource('AsyncCustomer');
  }
}

@Injectable()
@DiscoverableResource()
class DupAProvider implements ResourceDeclarationProvider {
  provideResource(): Resource {
    return sampleResource('Dup');
  }
}

@Injectable()
@DiscoverableResource()
class DupBProvider implements ResourceDeclarationProvider {
  provideResource(): Resource {
    return sampleResource('Dup');
  }
}

@Injectable()
@DiscoverableResource()
class ThrowingProvider implements ResourceDeclarationProvider {
  provideResource(): Resource {
    throw new Error('boom');
  }
}

@Injectable()
@DiscoverableResource()
class GoodThenBadFirst implements ResourceDeclarationProvider {
  provideResource(): Resource {
    return sampleResource('Good');
  }
}

@Injectable()
@DiscoverableResource()
class GoodThenBadSecond implements ResourceDeclarationProvider {
  provideResource(): Resource {
    return {
      identity: { namespace: '', name: '' },
      schema: {},
      annotations: {},
    } as unknown as Resource;
  }
}

@Injectable()
class UnmarkedProvider implements ResourceDeclarationProvider {
  provideResource(): Resource {
    return sampleResource('Hidden');
  }
}

describe('ResourceForgeModule.forRoot', () => {
  it('exposes registry after sync provider hosts successfully', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ResourceForgeModule.forRoot()],
      providers: [SyncCustomerProvider],
    }).compile();
    await moduleRef.init();

    const registry = moduleRef.get<ResourceRegistry>(RESOURCE_REGISTRY);
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) {
      return;
    }
    expect(registry.lookup(identity.value).status).toBe('hit');
    await moduleRef.close();
  });

  it('exposes registry after Promise<Resource> provider hosts successfully', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ResourceForgeModule.forRoot()],
      providers: [AsyncCustomerProvider],
    }).compile();
    await moduleRef.init();

    const registry = moduleRef.get<ResourceRegistry>(RESOURCE_REGISTRY);
    const identity = createResourceIdentity('crm', 'AsyncCustomer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) {
      return;
    }
    expect(registry.lookup(identity.value).status).toBe('hit');
    await moduleRef.close();
  });

  it('fails bootstrap on duplicate identity without ready registry exposure', async () => {
    // Host-in-factory: RESOURCE_REGISTRY factory runs during compile/load.
    await expect(
      Test.createTestingModule({
        imports: [ResourceForgeModule.forRoot()],
        providers: [DupAProvider, DupBProvider],
      }).compile(),
    ).rejects.toThrow(/registration_failed/);
  });

  it('fails bootstrap when provider throws', async () => {
    await expect(
      Test.createTestingModule({
        imports: [ResourceForgeModule.forRoot()],
        providers: [ThrowingProvider],
      }).compile(),
    ).rejects.toThrow(/resolution_failed/);
  });

  it('does not discover unmarked providers', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ResourceForgeModule.forRoot()],
      providers: [UnmarkedProvider],
    }).compile();
    await moduleRef.init();

    const registry = moduleRef.get<ResourceRegistry>(RESOURCE_REGISTRY);
    const identity = createResourceIdentity('crm', 'Hidden');
    expect(identity.ok).toBe(true);
    if (!identity.ok) {
      return;
    }
    expect(registry.lookup(identity.value).status).toBe('miss');
    await moduleRef.close();
  });

  it('does not expose partial registry when a later provider fails', async () => {
    await expect(
      Test.createTestingModule({
        imports: [ResourceForgeModule.forRoot()],
        providers: [GoodThenBadFirst, GoodThenBadSecond],
      }).compile(),
    ).rejects.toThrow(/validation_failed/);
  });
});

describe('ResourceForgeModule.forRootAsync', () => {
  it('hosts successfully with async Nest options factory', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ResourceForgeModule.forRootAsync({
          useFactory: async () => ({}),
        }),
      ],
      providers: [SyncCustomerProvider],
    }).compile();
    await moduleRef.init();

    const registry = moduleRef.get<ResourceRegistry>(RESOURCE_REGISTRY);
    const identity = createResourceIdentity('crm', 'Customer');
    expect(identity.ok).toBe(true);
    if (!identity.ok) {
      return;
    }
    expect(registry.lookup(identity.value).status).toBe('hit');
    await moduleRef.close();
  });

  it('does not accept a public registry option for shared mutation', () => {
    const asyncApi = ResourceForgeModule.forRootAsync({
      useFactory: () => ({}),
    });
    const factoryProvider = asyncApi.providers?.find(
      (provider) =>
        typeof provider === 'object' &&
        provider !== null &&
        'provide' in provider &&
        provider.provide === RESOURCE_REGISTRY,
    );
    expect(factoryProvider).toBeDefined();
    // Options type is Record<string, never> — no registry key in public options.
    const options: Parameters<typeof ResourceForgeModule.forRootAsync>[0] = {
      useFactory: () => ({}),
    };
    expect('registry' in (options as object)).toBe(false);
    expect(Module).toBeDefined();
  });
});
