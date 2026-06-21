import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest-setup.ts'],
    include: ['src/**/*.{test,spec}.{js,ts}'],
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      include: ['src/lib/**/*.{ts,svelte}'],
      exclude: [
        // Native-plugin wrappers, exercised via fakes (unit) + Playwright E2E, not unit-testable in jsdom.
        'src/lib/adapters/nativeAudio.ts',
        'src/lib/adapters/purchases.ts',
        'src/lib/adapters/preferences.ts',
        'src/lib/adapters/fakes/**',
        'src/lib/**/*.test.ts',
        'src/lib/types.ts'
      ],
      thresholds: { lines: 90, functions: 90, branches: 90, statements: 90 }
    }
  }
});
