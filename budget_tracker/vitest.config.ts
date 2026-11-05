import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    root: '.',
    include: ['server/test/**/*.spec.ts'],
    exclude: ['src/**'],
    environment: 'node',
    globals: false,
  },
});
