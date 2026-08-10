import { readFileSync } from 'node:fs';

export type ReadExplicitFileResult =
  | { readonly ok: true; readonly text: string }
  | { readonly ok: false; readonly message: string };

/** Command-local adapter: read exactly the supplied path as UTF-8 text. */
export function readExplicitFile(path: string): ReadExplicitFileResult {
  try {
    return { ok: true, text: readFileSync(path, 'utf8') };
  } catch (cause) {
    const message =
      cause instanceof Error ? cause.message : 'Unable to read file';
    return { ok: false, message };
  }
}
