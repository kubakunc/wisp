import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';
import { svelteTesting } from '@testing-library/svelte/vite';

/**
 * Vite plugin that silences sourcemap warnings for third-party packages
 * that ship compiled output without the original source files.
 * Runs after Vitest installs its own customLogger so we patch it post-resolve.
 */
function silenceDepSourcemapWarnings(): Plugin {
  return {
    name: 'silence-dep-sourcemap-warnings',
    enforce: 'post',
    configResolved(config) {
      const original = config.logger.warnOnce.bind(config.logger);
      config.logger.warnOnce = (msg, opts) => {
        if (msg.includes('Sourcemap for') && msg.includes('points to missing source files')) return;
        original(msg, opts);
      };
      const originalWarn = config.logger.warn.bind(config.logger);
      config.logger.warn = (msg, opts) => {
        if (msg.includes('Sourcemap for') && msg.includes('points to missing source files')) return;
        originalWarn(msg, opts);
      };
    }
  };
}

export default defineConfig({
  plugins: [sveltekit(), silenceDepSourcemapWarnings(), svelteTesting()],
  build: {
    rollupOptions: {
      // @capacitor-firebase/analytics's web shim imports firebase/analytics (a peer dep that's
      // not installed, since this is a native Capacitor app).  The native plugin is only used at
      // runtime on device, so we can safely treat firebase/* as external for the static build.
      external: (id) => id.startsWith('firebase/'),
    }
  },
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
        'src/lib/adapters/analytics.ts',
        'src/lib/adapters/admob.ts',
        'src/lib/adapters/filesystem.ts',
        'src/lib/adapters/fakes/**',
        'src/lib/**/*.test.ts',
        'src/lib/types.ts'
      ],
      thresholds: { lines: 90, functions: 90, branches: 90, statements: 90 }
    }
  }
});
