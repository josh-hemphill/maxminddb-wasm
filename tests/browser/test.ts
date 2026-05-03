import { describe, expect, it } from 'vitest'
import { server } from '@vitest/browser-playwright/context'

import { Maxmind } from '../../browser/index.js'
const { readFile } = server.commands

const dbFile = ((await readFile('../.GeoLite2-City-Test.mmdb', 'binary')) as unknown) as Uint8Array<ArrayBufferLike>
const dbFileAsn = ((await readFile('../.GeoLite2-ASN-Test.mmdb', 'binary')) as unknown) as Uint8Array<ArrayBufferLike>

describe('Maxmind DB', () => {
	const maxmind = new Maxmind(dbFile)

	const result = maxmind.lookup_city('2a02:d100::0001')

	it('should return the correct result', () => {
		expect(result).toBeDefined()
		expect(result?.location?.time_zone).toBe("Europe/Warsaw")
	})
	it('db should have the correct metadata', () => {
		expect(maxmind?.metadata?.languages?.includes('en')).toBe(true)
	})
})

describe('Maxmind DB ASN', () => {
	const maxmind = new Maxmind(dbFileAsn)
	const result = maxmind.lookup_isp('2c0f:ff80::')

	it('should return the correct result', () => {
		expect(result).toBeDefined()
		expect(result.asn?.as_num).toBe(237)
		expect(result.asn?.as_organization).toBe('Merit Network Inc.')
	})
	it('db should have the correct metadata', () => {
		expect(maxmind?.metadata?.languages?.includes('en')).toBe(true)
	})
})
