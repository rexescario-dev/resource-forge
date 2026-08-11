import {
  cpSync,
  existsSync,
  lstatSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  unlinkSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { run } from './run.js';

const here = dirname(fileURLToPath(import.meta.url));
const exampleRoot = join(here, '../../../examples/basic');
const goldenResourcePath = join(exampleRoot, 'resources', 'Item.json');

const NAMESPACE = 'demo';
const NAME = 'Item';
const RESOURCE_REL = 'resources/Item.json';

describe('examples/basic reproducibility (RFC-042)', () => {
  const dirs: string[] = [];

  afterEach(() => {
    for (const dir of dirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  function expectCanonicalMarker(dir: string): void {
    const marker = JSON.parse(
      readFileSync(join(dir, 'resource-forge.json'), 'utf8'),
    );
    expect(marker).toEqual({ version: 1, resourcesDir: 'resources' });
  }

  it('recreates the committed Resource golden via init → generate → validate → doctor', () => {
    expect(existsSync(join(exampleRoot, 'resource-forge.json'))).toBe(true);
    expect(existsSync(goldenResourcePath)).toBe(true);
    expect(lstatSync(join(exampleRoot, 'resources')).isDirectory()).toBe(true);

    const committedGolden = readFileSync(goldenResourcePath);
    const previous = process.cwd();
    const dir = mkdtempSync(join(tmpdir(), 'rf-ex-basic-'));
    dirs.push(dir);

    cpSync(exampleRoot, dir, { recursive: true });
    unlinkSync(join(dir, 'resources', 'Item.json'));

    expect(existsSync(join(dir, 'resource-forge.json'))).toBe(true);
    expect(lstatSync(join(dir, 'resources')).isDirectory()).toBe(true);
    expect(existsSync(join(dir, RESOURCE_REL))).toBe(false);
    expect(readFileSync(goldenResourcePath).equals(committedGolden)).toBe(true);

    try {
      process.chdir(dir);

      const initResult = run(['init', '.']);
      expect(initResult.exitCode).toBe(0);
      expect(initResult.stderr).toBe('');
      expectCanonicalMarker(dir);

      const genResult = run([
        'generate',
        'resource',
        NAMESPACE,
        NAME,
        RESOURCE_REL,
      ]);
      expect(genResult.exitCode).toBe(0);
      expect(genResult.stderr).toBe('');

      const produced = readFileSync(join(dir, RESOURCE_REL));
      expect(produced.equals(committedGolden)).toBe(true);

      const validateResult = run(['validate', RESOURCE_REL]);
      expect(validateResult.exitCode).toBe(0);

      const doctorResult = run(['doctor']);
      expect(doctorResult.exitCode).toBe(0);
    } finally {
      process.chdir(previous);
    }

    expect(readFileSync(goldenResourcePath).equals(committedGolden)).toBe(true);
  });
});
