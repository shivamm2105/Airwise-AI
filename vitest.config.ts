import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    testTimeout: 10000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: ['shared/**/*.ts', 'server/src/**/*.ts', 'client/src/**/*.{ts,tsx}'],
      exclude: ['**/*.d.ts', '**/main.tsx', 'server/src/index.ts', 'shared/types.ts', 'server/src/providers/AirQualityProvider.ts']
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
      '@shared': path.resolve(__dirname, './shared')
    }
  }
});
