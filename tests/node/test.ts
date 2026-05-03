import { join } from 'node:path'
import { test, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

import * as _Maxmind from '../../node/index.js'

const dbFile = readFileSync(join(__dirname, '..', '.GeoLite2-City-Test.mmdb'))
const dbFileAsn = readFileSync(join(__dirname, '..', '.GeoLite2-ASN-Test.mmdb'))

describe('Maxmind DB', () => {
	const maxmind = new _Maxmind.Maxmind(dbFile)

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
	const maxmind = new _Maxmind.Maxmind(dbFileAsn)
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
