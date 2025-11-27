import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';

export default defineConfig({
  test: {
    include: ['test.ts'],
    exclude: ['node_modules', 'dist', 'generated', '__snapshots__'],
    browser: {
      provider: playwright({ launchOptions: {'headless': true} }), // or 'webdriverio'
      enabled: true,
      headless: true,
      // at least one instance is required
      instances: [
        { browser: 'chromium' },
      ],
    },
  },
});
