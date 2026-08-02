import { join } from 'node:path'
import { test, describe, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'

import { Maxmind } from '../../node-module/index.js'

const dbFile = await readFile(join(__dirname, '..', '.GeoLite2-City-Test.mmdb'))
const dbFileAsn = await readFile(join(__dirname, '..', '.GeoLite2-ASN-Test.mmdb'))
const dbFileCountry = await readFile(join(__dirname, '..', '.GeoLite2-Country-Test.mmdb'))


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
	const withPrefix = maxmind.lookup_isp_prefix('2c0f:ff80::')

	it('should return the correct result', () => {
		expect(result).toBeDefined()
		expect(result.asn?.as_num).toBe(237)
		expect(result.asn?.as_organization).toBe('Merit Network Inc.')
	})
	it('lookup_isp_prefix should include prefix length', () => {
		expect(withPrefix.prefix_length).toBeGreaterThan(0)
		expect(withPrefix.isp.asn?.as_num).toBe(237)
	})
	it('db should have the correct metadata', () => {
		expect(maxmind?.metadata?.languages?.includes('en')).toBe(true)
	})
})
