import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test.ts'],
    exclude: ['node_modules', 'dist', 'generated', '__snapshots__'],
    browser: {
      provider: 'playwright', // or 'webdriverio'
      enabled: true,
      headless: true,
      // at least one instance is required
      instances: [
        { browser: 'chromium' },
      ],
    },
  },
});
