import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
	test: {
		poolOptions: {
			workers: {
				wrangler: { configPath: './wrangler.jsonc' },
				miniflare: {
					modules: true,
					wasm: true,
					dataBlobBindings: {
						MAXMIND_DB: "../.GeoLite2-City-Test.mmdb",
					},
				},
			},
		},
	},
});
