import init, { Maxmind } from '../../../browser/index.js';
import wasmModule from '../../../browser/index_bg.wasm';

const LOOKUP_IP = '2a02:d100::0001';

export default {
	async fetch(request, env): Promise<Response> {
		await init({ module_or_path: wasmModule });
		const maxmind = new Maxmind(new Uint8Array(env.MAXMIND_DB));
		const result = maxmind.lookup_city(LOOKUP_IP);
		return new Response(JSON.stringify(result));
	},
} satisfies ExportedHandler<Env>;
