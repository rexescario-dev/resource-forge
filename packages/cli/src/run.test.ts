import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { COMMAND_REGISTRY } from './command-registry.js';
import * as cli from './index.js';
import {
  getResolveCoreCallCountForTests,
  resetResolveCoreCallCountForTests,
  resetResolveCoreForTests,
  setResolveCoreForTests,
} from './resolve-core.js';
import { run } from './run.js';

const packageJson = JSON.parse(
  readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '../package.json'),
    'utf8',
  ),
) as { version: string; dependencies?: Record<string, string> };

const fixturesDir = join(
  dirname(fileURLToPath(import.meta.url)),
  '../test/fixtures',
);
const validMinimalPath = join(fixturesDir, 'valid-minimal.json');
const invalidIdentityPath = join(fixturesDir, 'invalid-identity.json');
const invalidJsonPath = join(fixturesDir, 'invalid-json.txt');
const nonObjectArrayPath = join(fixturesDir, 'non-object-array.json');
const missingPath = join(fixturesDir, 'does-not-exist.json');

afterEach(() => {
  resetResolveCoreForTests();
  resetResolveCoreCallCountForTests();
});

describe('run()', () => {
  it('prints help for bare argv', () => {
    const result = run([]);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout.length).toBeGreaterThan(0);
    expect(result.stdout).toMatch(/rf/i);
  });

  it('prints help for --help', () => {
    const result = run(['--help']);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout.length).toBeGreaterThan(0);
    expect(result.stdout).toMatch(/--help/);
  });

  it('prints package version for --version', () => {
    const result = run(['--version']);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout.trim()).toBe(packageJson.version);
  });

  it('prefers --help when both --help and --version are present', () => {
    const result = run(['--help', '--version']);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toMatch(/--help/);
    expect(result.stdout.trim()).not.toBe(packageJson.version);
  });

  it('rejects unknown commands', () => {
    const result = run(['foo']);
    expect(result.exitCode).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr.length).toBeGreaterThan(0);
    expect(result.stderr.toLowerCase()).toMatch(/unknown command/);
  });

  it('treats command-before-help as unknown command', () => {
    const result = run(['foo', '--help']);
    expect(result.exitCode).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr.toLowerCase()).toMatch(/unknown command/);
  });

  it('rejects unsupported global options', () => {
    const result = run(['--unknown-flag']);
    expect(result.exitCode).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr.length).toBeGreaterThan(0);
    expect(result.stderr.toLowerCase()).toMatch(
      /unknown option|unsupported|invalid/,
    );
    expect(result.stderr.toLowerCase()).not.toMatch(/unknown command/);
  });
});

describe('run() validate', () => {
  it('validates a minimal Resource file', () => {
    const result = run(['validate', validMinimalPath]);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
  });

  it('returns exit 1 for semantically invalid Resource JSON', () => {
    const result = run(['validate', invalidIdentityPath]);
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr.length).toBeGreaterThan(0);
  });

  it('returns exit 2 when path is missing', () => {
    const result = run(['validate']);
    expect(result.exitCode).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr.length).toBeGreaterThan(0);
  });

  it('returns exit 2 for extra positional arguments', () => {
    const result = run(['validate', validMinimalPath, 'extra.json']);
    expect(result.exitCode).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr.length).toBeGreaterThan(0);
  });

  it('returns exit 2 for missing file', () => {
    const result = run(['validate', missingPath]);
    expect(result.exitCode).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr.length).toBeGreaterThan(0);
  });

  it('returns exit 2 for invalid JSON', () => {
    const result = run(['validate', invalidJsonPath]);
    expect(result.exitCode).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr.length).toBeGreaterThan(0);
  });

  it('returns exit 2 for non-object JSON', () => {
    const result = run(['validate', nonObjectArrayPath]);
    expect(result.exitCode).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr.length).toBeGreaterThan(0);
  });

  it('returns exit 2 for undefined post-command options', () => {
    const result = run(['validate', '--flag']);
    expect(result.exitCode).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr.length).toBeGreaterThan(0);
  });

  it('preserves global --help when followed by validate', () => {
    const result = run(['--help', 'validate']);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toMatch(/--help/);
  });
});

describe('run() doctor', () => {
  it('reports healthy environment', () => {
    const result = run(['doctor']);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toMatch(/version:\s*ok/);
    expect(result.stdout).toMatch(/registry:\s*ok/);
    expect(result.stdout).toMatch(/core:\s*ok/);
  });

  it('returns exit 2 with extra positional without running probes', () => {
    resetResolveCoreCallCountForTests();
    const result = run(['doctor', 'extra']);
    expect(result.exitCode).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr.length).toBeGreaterThan(0);
    expect(getResolveCoreCallCountForTests()).toBe(0);
  });

  it('returns exit 2 for undefined post-command options', () => {
    resetResolveCoreCallCountForTests();
    const result = run(['doctor', '--flag']);
    expect(result.exitCode).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr.length).toBeGreaterThan(0);
    expect(getResolveCoreCallCountForTests()).toBe(0);
  });

  it('preserves global --help when followed by doctor', () => {
    const result = run(['--help', 'doctor']);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toMatch(/--help/);
    expect(result.stdout).not.toMatch(/version:\s*ok/);
  });

  it('reports core FAIL via internal seam and still reports siblings', () => {
    setResolveCoreForTests(() => {
      throw new Error('simulated missing core');
    });
    const result = run(['doctor']);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toBe('');
    expect(result.stdout).toMatch(/version:\s*ok/);
    expect(result.stdout).toMatch(/registry:\s*ok/);
    expect(result.stdout).toMatch(/core:\s*FAIL/);
  });

  it('registry check observes the same dispatch registry as run', () => {
    const validateHandler = COMMAND_REGISTRY.get('validate');
    expect(validateHandler).toBeDefined();
    COMMAND_REGISTRY.delete('validate');
    try {
      const result = run(['doctor']);
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toBe('');
      expect(result.stdout).toMatch(/registry:\s*FAIL/);
      expect(result.stdout).toMatch(/version:\s*ok/);
      expect(result.stdout).toMatch(/core:\s*ok/);
    } finally {
      COMMAND_REGISTRY.set('validate', validateHandler!);
    }
  });
});

describe('public package surface', () => {
  it('exports run and does not export placeholder or internal symbols', () => {
    expect(typeof cli.run).toBe('function');
    expect(cli).not.toHaveProperty('CORE_DEPENDENCY');
    expect(cli).not.toHaveProperty('PACKAGE_NAME');
    expect(cli).not.toHaveProperty('PACKAGE_VERSION');
    expect(cli).not.toHaveProperty('CommandRegistry');
    expect(cli).not.toHaveProperty('validateResourceDocument');
    expect(cli).not.toHaveProperty('COMMAND_REGISTRY');
    expect(cli).not.toHaveProperty('setResolveCoreForTests');
  });

  it('depends only on @resource-forge/core among workspace packages', () => {
    const deps = Object.keys(packageJson.dependencies ?? {});
    expect(deps.filter((name) => name.startsWith('@resource-forge/'))).toEqual([
      '@resource-forge/core',
    ]);
  });
});
