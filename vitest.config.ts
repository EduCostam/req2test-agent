import { defineConfig } from 'vitest/config';
export default defineConfig({ test: {
  setupFiles: ['tests/offline.ts'],
  coverage: { provider: 'v8', include: ['packages/core/src/**/*.ts', 'packages/llm/src/**/*.ts'],
    reporter: ['text', 'json-summary'], thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 } },
} });
