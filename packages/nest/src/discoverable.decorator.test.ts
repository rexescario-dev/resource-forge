import 'reflect-metadata';
import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import {
  DISCOVERABLE_RESOURCE_METADATA,
  DiscoverableResource,
} from './discoverable.decorator.js';
import { RESOURCE_REGISTRY } from './tokens.js';

describe('RESOURCE_REGISTRY', () => {
  it('is a unique injection token', () => {
    expect(typeof RESOURCE_REGISTRY).toBe('symbol');
    expect(RESOURCE_REGISTRY.description).toBe('RESOURCE_REGISTRY');
  });
});

describe('DiscoverableResource', () => {
  it('sets discoverability metadata readable via Reflector', () => {
    @DiscoverableResource()
    class Marked {}

    const reflector = new Reflector();
    expect(
      reflector.get(DISCOVERABLE_RESOURCE_METADATA, Marked),
    ).toBe(true);
  });
});
