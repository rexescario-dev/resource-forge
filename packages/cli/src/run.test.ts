import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import * as cli from './index.js';
import { run } from './run.js';

const packageJson = JSON.parse(
  readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '../package.json'),
    'utf8',
  ),
) as { version: string; dependencies?: Record<string, string> };

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
    expect(result.stderr.toLowerCase()).toMatch(/unknown option|unsupported|invalid/);
    expect(result.stderr.toLowerCase()).not.toMatch(/unknown command/);
  });
});

describe('public package surface', () => {
  it('exports run and does not export placeholder or internal symbols', () => {
    expect(typeof cli.run).toBe('function');
    expect(cli).not.toHaveProperty('CORE_DEPENDENCY');
    expect(cli).not.toHaveProperty('PACKAGE_NAME');
    expect(cli).not.toHaveProperty('PACKAGE_VERSION');
    expect(cli).not.toHaveProperty('CommandRegistry');
  });

  it('has no @resource-forge/* dependencies', () => {
    const deps = Object.keys(packageJson.dependencies ?? {});
    expect(deps.filter((name) => name.startsWith('@resource-forge/'))).toEqual(
      [],
    );
  });
});
