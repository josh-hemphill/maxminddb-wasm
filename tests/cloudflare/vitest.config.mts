import { cloudflareTest } from '@cloudflare/vitest-pool-workers';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [
		cloudflareTest({
			wrangler: { configPath: './wrangler.jsonc' },
			miniflare: {
				dataBlobBindings: {
					MAXMIND_DB: '../.GeoLite2-City-Test.mmdb',
				},
			},
		}),
	],
});
