import { defineConfig } from 'vitest/config';

export default defineConfig({
  cacheDir: './.vite-test-cache',
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    testTimeout: 30000,
  },
});
