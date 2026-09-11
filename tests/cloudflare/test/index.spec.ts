import { env } from 'cloudflare:workers';
import { describe, it, expect } from 'vitest';
import worker from '../src/index';
import { LOOKUP_FIXTURES } from '../../fixtures.ts';

describe('Maxmind IP Lookup worker', () => {
	it('responds with city lookup data', async () => {
		const request = new Request('http://example.com');
		const response = await worker.fetch(request, env, {} as ExecutionContext);
		expect(await response.json()).toMatchObject({
			location: { time_zone: LOOKUP_FIXTURES.cityIpv6.timeZone },
		});
	});
});
