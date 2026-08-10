import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@resource-forge/core': path.resolve(root, 'packages/core/src/index.ts'),
      '@resource-forge/prisma': path.resolve(
        root,
        'packages/prisma/src/index.ts',
      ),
    },
  },
});
