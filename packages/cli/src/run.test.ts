import {
  existsSync,
  linkSync,
  lstatSync,
  mkdirSync,
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
  createInitProject,
  resetInitProjectForTests,
  setInspectPathForTests,
  setLinkMarkerForTests,
  setMkdirResourcesForTests,
} from './init-project.js';
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

describe('run() init', () => {
  const dirs: string[] = [];

  afterEach(() => {
    for (const dir of dirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
    resetInitProjectForTests();
  });

  function tempDir(): string {
    const dir = mkdtempSync(join(tmpdir(), 'rf-init-'));
    dirs.push(dir);
    return dir;
  }

  function expectCanonical(dir: string): void {
    const marker = JSON.parse(
      readFileSync(join(dir, 'resource-forge.json'), 'utf8'),
    );
    expect(marker).toEqual({ version: 1, resourcesDir: 'resources' });
    expect(lstatSync(join(dir, 'resources')).isDirectory()).toBe(true);
  }

  it('creates marker and resources in an empty directory', () => {
    const dir = tempDir();
    const result = run(['init', dir]);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expectCanonical(dir);
  });

  it('creates marker and resources when target is absent', () => {
    const parent = tempDir();
    const target = join(parent, 'new-project');
    const result = run(['init', target]);
    expect(result.exitCode).toBe(0);
    expectCanonical(target);
  });

  it('creates in a directory that already has unrelated files', () => {
    const dir = tempDir();
    writeFileSync(join(dir, 'README.md'), 'hello\n', 'utf8');
    const result = run(['init', dir]);
    expect(result.exitCode).toBe(0);
    expectCanonical(dir);
    expect(readFileSync(join(dir, 'README.md'), 'utf8')).toBe('hello\n');
  });

  it('is a no-op when already conforming', () => {
    const dir = tempDir();
    expect(run(['init', dir]).exitCode).toBe(0);
    const before = readFileSync(join(dir, 'resource-forge.json'), 'utf8');
    const again = run(['init', dir]);
    expect(again.exitCode).toBe(0);
    expect(again.stderr).toBe('');
    expect(readFileSync(join(dir, 'resource-forge.json'), 'utf8')).toBe(before);
  });

  it('defaults path to cwd when omitted', () => {
    const dir = tempDir();
    const previous = process.cwd();
    try {
      process.chdir(dir);
      const result = run(['init']);
      expect(result.exitCode).toBe(0);
      expectCanonical(dir);
    } finally {
      process.chdir(previous);
    }
  });

  it('returns exit 2 for resources-only half-init', () => {
    const dir = tempDir();
    mkdirSync(join(dir, 'resources'));
    const result = run(['init', dir]);
    expect(result.exitCode).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr.length).toBeGreaterThan(0);
    expect(existsSync(join(dir, 'resource-forge.json'))).toBe(false);
  });

  it('returns exit 2 for marker-only half-init', () => {
    const dir = tempDir();
    writeFileSync(
      join(dir, 'resource-forge.json'),
      `${JSON.stringify({ version: 1, resourcesDir: 'resources' }, null, 2)}\n`,
      'utf8',
    );
    const result = run(['init', dir]);
    expect(result.exitCode).toBe(2);
    expect(existsSync(join(dir, 'resources'))).toBe(false);
  });

  it('returns exit 2 for non-canonical marker with resources', () => {
    const dir = tempDir();
    mkdirSync(join(dir, 'resources'));
    writeFileSync(
      join(dir, 'resource-forge.json'),
      `${JSON.stringify({ version: 2, resourcesDir: 'resources' }, null, 2)}\n`,
      'utf8',
    );
    const before = readFileSync(join(dir, 'resource-forge.json'), 'utf8');
    const result = run(['init', dir]);
    expect(result.exitCode).toBe(2);
    expect(readFileSync(join(dir, 'resource-forge.json'), 'utf8')).toBe(before);
  });

  it('returns exit 2 when resources is a file', () => {
    const dir = tempDir();
    writeFileSync(join(dir, 'resources'), 'not-a-dir\n', 'utf8');
    const result = run(['init', dir]);
    expect(result.exitCode).toBe(2);
    expect(existsSync(join(dir, 'resource-forge.json'))).toBe(false);
  });

  it('returns exit 2 when target is a file', () => {
    const dir = tempDir();
    const target = join(dir, 'not-a-dir');
    writeFileSync(target, 'file\n', 'utf8');
    const result = run(['init', target]);
    expect(result.exitCode).toBe(2);
  });

  it('returns exit 2 for uninspectable marker/layout via seam', () => {
    const dir = tempDir();
    setInspectPathForTests((path) => {
      if (path === dir) {
        return { exists: true, isDirectory: true, isFile: false };
      }
      throw new Error('uninspectable layout');
    });
    const result = run(['init', dir]);
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toMatch(/uninspectable/i);
    expect(existsSync(join(dir, 'resource-forge.json'))).toBe(false);
  });

  it('returns exit 2 for extra positionals', () => {
    const result = run(['init', tempDir(), 'extra']);
    expect(result.exitCode).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr.length).toBeGreaterThan(0);
  });

  it('returns exit 2 for option-like tokens', () => {
    const result = run(['init', '--flag']);
    expect(result.exitCode).toBe(2);
    expect(result.stderr.length).toBeGreaterThan(0);
  });

  it('returns exit 2 for init --help as usage, not special help', () => {
    const result = run(['init', '--help']);
    expect(result.exitCode).toBe(2);
    expect(result.stdout).toBe('');
  });

  it('honors global --help before init without creating', () => {
    const dir = tempDir();
    const result = run(['--help', 'init']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/Usage:/);
    expect(existsSync(join(dir, 'resource-forge.json'))).toBe(false);
  });

  it('does not overwrite a pre-existing marker during create race', () => {
    const dir = tempDir();
    const markerPath = join(dir, 'resource-forge.json');
    writeFileSync(markerPath, '{"kept":true}\n', 'utf8');
    // Force creatable classification, then fail exclusive link like a race.
    setInspectPathForTests((path) => {
      if (path === dir) {
        return { exists: true, isDirectory: true, isFile: false };
      }
      return { exists: false, isDirectory: false, isFile: false };
    });
    setLinkMarkerForTests(() => {
      const error = new Error('file already exists') as NodeJS.ErrnoException;
      error.code = 'EEXIST';
      throw error;
    });
    const before = readFileSync(markerPath, 'utf8');
    const result = run(['init', dir]);
    expect(result.exitCode).toBe(1);
    expect(readFileSync(markerPath, 'utf8')).toBe(before);
  });

  it('maps post-classify resources EEXIST to exit 1 not conflict 2', () => {
    const dir = tempDir();
    setMkdirResourcesForTests(() => {
      const error = new Error('file already exists') as NodeJS.ErrnoException;
      error.code = 'EEXIST';
      throw error;
    });
    const result = run(['init', dir]);
    expect(result.exitCode).toBe(1);
    expect(existsSync(join(dir, 'resource-forge.json'))).toBe(false);
  });
});

describe('init-project create safety', () => {
  const dirs: string[] = [];

  afterEach(() => {
    for (const dir of dirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
    resetInitProjectForTests();
  });

  function tempDir(): string {
    const dir = mkdtempSync(join(tmpdir(), 'rf-init-seam-'));
    dirs.push(dir);
    return dir;
  }

  it('cleans empty resources when marker link fails after mkdir', () => {
    const dir = tempDir();
    setLinkMarkerForTests(() => {
      throw new Error('publish failed');
    });
    const outcome = createInitProject(dir);
    expect(outcome.ok).toBe(false);
    expect(existsSync(join(dir, 'resources'))).toBe(false);
    expect(existsSync(join(dir, 'resource-forge.json'))).toBe(false);
  });

  it('uses link publish rather than writing the final marker path directly', () => {
    const dir = tempDir();
    let linked = false;
    setLinkMarkerForTests((tempPath, markerPath) => {
      linked = true;
      expect(existsSync(tempPath)).toBe(true);
      expect(readFileSync(tempPath, 'utf8')).toMatch(/"version": 1/);
      expect(existsSync(markerPath)).toBe(false);
      linkSync(tempPath, markerPath);
    });
    const outcome = createInitProject(dir);
    expect(outcome.ok).toBe(true);
    expect(linked).toBe(true);
    expect(existsSync(join(dir, 'resource-forge.json'))).toBe(true);
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
    expect(cli).not.toHaveProperty('createInitProject');
    expect(cli).not.toHaveProperty('setLinkMarkerForTests');
  });

  it('depends only on @resource-forge/core among workspace packages', () => {
    const deps = Object.keys(packageJson.dependencies ?? {});
    expect(deps.filter((name) => name.startsWith('@resource-forge/'))).toEqual([
      '@resource-forge/core',
    ]);
  });
});
