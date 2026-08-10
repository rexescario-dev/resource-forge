import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
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
import {
  resetWriteResourceDocumentForTests,
  setFinalizeWriteForTests,
  writeResourceDocument,
} from './write-resource-document.js';

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
      // Collect-all: siblings still reported (core pass/fail independent of registry).
      expect(result.stdout).toMatch(/core:\s*(ok|FAIL)/);
    } finally {
      COMMAND_REGISTRY.set('validate', validateHandler!);
    }
  });
});

describe('run() generate', () => {
  const dirs: string[] = [];

  afterEach(() => {
    for (const dir of dirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
    resetWriteResourceDocumentForTests();
  });

  function tempDir(): string {
    const dir = mkdtempSync(join(tmpdir(), 'rf-gen-'));
    dirs.push(dir);
    return dir;
  }

  it('generates a minimal Resource JSON and round-trips validate', () => {
    const path = join(tempDir(), 'customer.json');
    const result = run(['generate', 'resource', 'crm', 'Customer', path]);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(existsSync(path)).toBe(true);
    expect(run(['validate', path]).exitCode).toBe(0);
  });

  it('returns exit 1 for core-rejected identity and does not write', () => {
    const path = join(tempDir(), 'resource.json');
    const result = run(['generate', 'resource', 'rf', 'Resource', path]);
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr.length).toBeGreaterThan(0);
    expect(existsSync(path)).toBe(false);
  });

  it('returns exit 2 for unknown kind', () => {
    const path = join(tempDir(), 'out.json');
    const result = run(['generate', 'widget', 'crm', 'Customer', path]);
    expect(result.exitCode).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr.length).toBeGreaterThan(0);
    expect(existsSync(path)).toBe(false);
  });

  it('returns exit 2 for missing tokens', () => {
    const result = run(['generate', 'resource', 'crm']);
    expect(result.exitCode).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr.length).toBeGreaterThan(0);
  });

  it('returns exit 2 for extra tokens', () => {
    const path = join(tempDir(), 'out.json');
    const result = run([
      'generate',
      'resource',
      'crm',
      'Customer',
      path,
      'extra',
    ]);
    expect(result.exitCode).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr.length).toBeGreaterThan(0);
    expect(existsSync(path)).toBe(false);
  });

  it('returns exit 2 for undefined post-command options', () => {
    const result = run(['generate', '--flag']);
    expect(result.exitCode).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr.length).toBeGreaterThan(0);
  });

  it('returns exit 2 when parent directory is missing', () => {
    const path = join(tempDir(), 'missing-parent', 'out.json');
    const result = run(['generate', 'resource', 'crm', 'Customer', path]);
    expect(result.exitCode).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr.length).toBeGreaterThan(0);
    expect(existsSync(path)).toBe(false);
  });

  it('returns exit 2 when destination already exists and does not overwrite', () => {
    const path = join(tempDir(), 'existing.json');
    writeFileSync(path, '{"kept":true}\n', 'utf8');
    const before = readFileSync(path, 'utf8');
    const result = run(['generate', 'resource', 'crm', 'Customer', path]);
    expect(result.exitCode).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr.length).toBeGreaterThan(0);
    expect(readFileSync(path, 'utf8')).toBe(before);
  });

  it('preserves global --help when followed by generate', () => {
    const result = run(['--help', 'generate']);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toMatch(/--help/);
  });

  it('maps late destination conflict from finalize seam to exit 2', () => {
    const path = join(tempDir(), 'race.json');
    setFinalizeWriteForTests(() => {
      const error = new Error('file already exists') as NodeJS.ErrnoException;
      error.code = 'EEXIST';
      throw error;
    });
    const result = run(['generate', 'resource', 'crm', 'Customer', path]);
    expect(result.exitCode).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr.length).toBeGreaterThan(0);
    expect(existsSync(path)).toBe(false);
  });
});

describe('writeResourceDocument seam', () => {
  const dirs: string[] = [];

  afterEach(() => {
    for (const dir of dirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
    resetWriteResourceDocumentForTests();
  });

  function tempDir(): string {
    const dir = mkdtempSync(join(tmpdir(), 'rf-write-'));
    dirs.push(dir);
    return dir;
  }

  it('writes complete JSON on successful finalization', () => {
    const path = join(tempDir(), 'ok.json');
    const outcome = writeResourceDocument(path, '{\n  "ok": true\n}\n');
    expect(outcome).toEqual({ ok: true });
    expect(existsSync(path)).toBe(true);
    expect(readFileSync(path, 'utf8')).toBe('{\n  "ok": true\n}\n');
  });

  it('leaves destination absent when finalize fails unexpectedly', () => {
    const path = join(tempDir(), 'fail.json');
    setFinalizeWriteForTests(() => {
      throw new Error('simulated finalize failure');
    });
    const outcome = writeResourceDocument(path, '{"x":1}\n');
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.kind).toBe('unexpected');
    }
    expect(existsSync(path)).toBe(false);
  });

  it('does not overwrite when destination exists at precheck', () => {
    const path = join(tempDir(), 'exists.json');
    writeFileSync(path, '{"kept":true}\n', 'utf8');
    const before = readFileSync(path, 'utf8');
    const refused = writeResourceDocument(path, '{"new":true}\n');
    expect(refused.ok).toBe(false);
    if (!refused.ok) {
      expect(refused.kind).toBe('destination_exists');
    }
    expect(readFileSync(path, 'utf8')).toBe(before);
  });

  it('maps late EEXIST from finalize without creating destination', () => {
    const path = join(tempDir(), 'late.json');
    setFinalizeWriteForTests(() => {
      const error = new Error('file already exists') as NodeJS.ErrnoException;
      error.code = 'EEXIST';
      throw error;
    });
    const outcome = writeResourceDocument(path, '{"new":true}\n');
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.kind).toBe('destination_exists');
    }
    expect(existsSync(path)).toBe(false);
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
    expect(cli).not.toHaveProperty('writeResourceDocument');
    expect(cli).not.toHaveProperty('setFinalizeWriteForTests');
  });

  it('depends only on @resource-forge/core among workspace packages', () => {
    const deps = Object.keys(packageJson.dependencies ?? {});
    expect(deps.filter((name) => name.startsWith('@resource-forge/'))).toEqual([
      '@resource-forge/core',
    ]);
  });
});
