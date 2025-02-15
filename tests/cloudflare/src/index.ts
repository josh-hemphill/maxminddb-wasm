/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import init, { Maxmind } from '../../../browser/index.js';

export default {
	async fetch(request, env, ctx): Promise<Response> {
		init();
		const maxmind = new Maxmind(new Uint8Array(env.MAXMIND_DB));
		const ip = '2a02:d100::0001';
		const result = maxmind.lookup_city(ip);
		return new Response(JSON.stringify(result));
	},
} satisfies ExportedHandler<Env>;
