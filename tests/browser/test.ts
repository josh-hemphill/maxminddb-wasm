import { describe, expect, it } from 'vitest'
import { server } from 'vitest/browser'

import { Maxmind } from '../../browser/index.js'
const { readFile } = server.commands

const dbFile = ((await readFile('../.GeoLite2-City-Test.mmdb', 'binary')) as unknown) as Uint8Array<ArrayBufferLike>
const dbFileAsn = ((await readFile('../.GeoLite2-ASN-Test.mmdb', 'binary')) as unknown) as Uint8Array<ArrayBufferLike>
const dbFileCountry = ((await readFile('../.GeoLite2-Country-Test.mmdb', 'binary')) as unknown) as Uint8Array<ArrayBufferLike>

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
	it('free after not-found lookup should succeed', () => {
		const db = new Maxmind(dbFile)
		expect(() => db.lookup_city('127.0.0.1')).toThrow(/Result Not Found/)
		expect(() => db.free()).not.toThrow()
	})
})

describe('Maxmind DB Country', () => {
	const maxmind = new Maxmind(dbFileCountry)
	const result = maxmind.lookup_country('2.125.160.216')

	it('should return country for GeoLite2-Country', () => {
		expect(result).toBeDefined()
		expect(result.country?.iso_code).toBe('GB')
		expect(result.continent?.code).toBe('EU')
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
