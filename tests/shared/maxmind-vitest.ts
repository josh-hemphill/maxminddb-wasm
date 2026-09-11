import { describe, expect, it } from 'vitest'
import { LOOKUP_ERRORS, LOOKUP_FIXTURES } from '../fixtures.ts'

type CityLookup = {
	city?: { names?: Record<string, string> }
	country?: { iso_code?: string }
	location?: { time_zone?: string }
}

type CountryLookup = {
	continent?: { code?: string }
	country?: { iso_code?: string }
}

type IspLookup = {
	asn?: { as_num?: number; as_organization?: string }
}

type PrefixLookup = {
	city: CityLookup
	prefix_length: number
}

type IspPrefixLookup = {
	isp: IspLookup
	prefix_length: number
}

export type MaxmindLike = {
	lookup_city(ip: string): CityLookup
	lookup_country(ip: string): CountryLookup
	lookup_isp(ip: string): IspLookup
	lookup_prefix(ip: string): PrefixLookup
	lookup_isp_prefix(ip: string): IspPrefixLookup
	free(): void
	metadata: { languages?: string[]; database_type?: string }
}

export type MaxmindCtor = new (db: Uint8Array) => MaxmindLike

export function registerMaxmindTests(
	Maxmind: MaxmindCtor,
	dbs: { city: Uint8Array; asn: Uint8Array; country: Uint8Array },
) {
	describe('Maxmind DB', () => {
		const maxmind = new Maxmind(dbs.city)

		it('should return city data for IPv6', () => {
			const result = maxmind.lookup_city(LOOKUP_FIXTURES.cityIpv6.ip)
			expect(result).toBeDefined()
			expect(result.location?.time_zone).toBe(LOOKUP_FIXTURES.cityIpv6.timeZone)
		})

		it('should return city data for IPv4', () => {
			const result = maxmind.lookup_city(LOOKUP_FIXTURES.cityIpv4.ip)
			expect(result.country?.iso_code).toBe(LOOKUP_FIXTURES.cityIpv4.countryIso)
		})

		it('lookup_prefix should include prefix length', () => {
			const result = maxmind.lookup_prefix(LOOKUP_FIXTURES.cityIpv6.ip)
			expect(result.prefix_length).toBeGreaterThan(0)
			expect(result.city.location?.time_zone).toBe(LOOKUP_FIXTURES.cityIpv6.timeZone)
		})

		it('lookup_country should work on a city database', () => {
			const result = maxmind.lookup_country(LOOKUP_FIXTURES.cityIpv4.ip)
			expect(result.country?.iso_code).toBe(LOOKUP_FIXTURES.cityIpv4.countryIso)
		})

		it('db should have the correct metadata', () => {
			expect(maxmind.metadata?.languages?.includes('en')).toBe(true)
		})

		it('invalid IP should throw', () => {
			expect(() => maxmind.lookup_city(LOOKUP_FIXTURES.invalidIp)).toThrow(LOOKUP_ERRORS.invalidIp)
		})

		it('free after not-found lookup should succeed', () => {
			const db = new Maxmind(dbs.city)
			expect(() => db.lookup_city(LOOKUP_FIXTURES.missingIp)).toThrow(LOOKUP_ERRORS.notFound)
			expect(() => db.free()).not.toThrow()
		})

		it('invalid database bytes should throw', () => {
			expect(() => new Maxmind(new Uint8Array([1, 2, 3, 4]))).toThrow(LOOKUP_ERRORS.invalidDatabase)
		})
	})

	describe('Maxmind DB Country', () => {
		const maxmind = new Maxmind(dbs.country)
		const result = maxmind.lookup_country(LOOKUP_FIXTURES.country.ip)

		it('should return country for GeoLite2-Country', () => {
			expect(result).toBeDefined()
			expect(result.country?.iso_code).toBe(LOOKUP_FIXTURES.country.iso)
			expect(result.continent?.code).toBe(LOOKUP_FIXTURES.country.continent)
		})
	})

	describe('Maxmind DB ASN', () => {
		const maxmind = new Maxmind(dbs.asn)
		const result = maxmind.lookup_isp(LOOKUP_FIXTURES.asn.ip)
		const withPrefix = maxmind.lookup_isp_prefix(LOOKUP_FIXTURES.asn.ip)

		it('should return the correct result', () => {
			expect(result).toBeDefined()
			expect(result.asn?.as_num).toBe(LOOKUP_FIXTURES.asn.asNum)
			expect(result.asn?.as_organization).toBe(LOOKUP_FIXTURES.asn.org)
		})

		it('lookup_isp_prefix should include prefix length', () => {
			expect(withPrefix.prefix_length).toBeGreaterThan(0)
			expect(withPrefix.isp.asn?.as_num).toBe(LOOKUP_FIXTURES.asn.asNum)
		})

		it('db should expose ASN metadata', () => {
			expect(maxmind.metadata?.database_type).toMatch(/ASN/i)
		})
	})
}
