import { LOOKUP_ERRORS, LOOKUP_FIXTURES } from '../fixtures.ts'

type CityLookup = {
	location?: { time_zone?: string }
	country?: { iso_code?: string }
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

export type RuntimeMaxmind = {
	lookup_city(ip: string): CityLookup
	lookup_country(ip: string): CountryLookup
	lookup_isp(ip: string): IspLookup
	lookup_prefix(ip: string): PrefixLookup
	lookup_isp_prefix(ip: string): IspPrefixLookup
	free(): void
	metadata: { languages?: string[]; database_type?: string }
}

const fail = (message: string): never => {
	throw new Error(message)
}

export const assertCityLookups = (maxmind: RuntimeMaxmind) => {
	const ipv6 = maxmind.lookup_city(LOOKUP_FIXTURES.cityIpv6.ip)
	if (ipv6?.location?.time_zone !== LOOKUP_FIXTURES.cityIpv6.timeZone) {
		fail(`Expected timezone ${LOOKUP_FIXTURES.cityIpv6.timeZone}`)
	}
	const ipv4 = maxmind.lookup_city(LOOKUP_FIXTURES.cityIpv4.ip)
	if (ipv4?.country?.iso_code !== LOOKUP_FIXTURES.cityIpv4.countryIso) {
		fail(`Expected country ${LOOKUP_FIXTURES.cityIpv4.countryIso}`)
	}
	const prefix = maxmind.lookup_prefix(LOOKUP_FIXTURES.cityIpv6.ip)
	if (!(prefix.prefix_length > 0)) {
		fail('Expected city prefix length')
	}
	if (!maxmind.metadata?.languages?.includes('en')) {
		fail('Metadata Missing')
	}
	try {
		maxmind.lookup_city(LOOKUP_FIXTURES.invalidIp)
		fail('Expected invalid IP error')
	} catch (error) {
		if (!LOOKUP_ERRORS.invalidIp.test(String(error))) {
			fail(`Expected Invalid IP, got ${String(error)}`)
		}
	}
}

export const assertCountryLookup = (maxmind: RuntimeMaxmind) => {
	const result = maxmind.lookup_country(LOOKUP_FIXTURES.country.ip)
	if (result?.country?.iso_code !== LOOKUP_FIXTURES.country.iso) {
		fail('Country Result Missing')
	}
	if (result?.continent?.code !== LOOKUP_FIXTURES.country.continent) {
		fail('Continent Result Missing')
	}
}

export const assertAsnLookup = (maxmind: RuntimeMaxmind) => {
	const result = maxmind.lookup_isp(LOOKUP_FIXTURES.asn.ip)
	if (result?.asn?.as_num !== LOOKUP_FIXTURES.asn.asNum) {
		fail('ASN Result Missing')
	}
	const withPrefix = maxmind.lookup_isp_prefix(LOOKUP_FIXTURES.asn.ip)
	if (!(withPrefix.prefix_length > 0) || withPrefix.isp.asn?.as_num !== LOOKUP_FIXTURES.asn.asNum) {
		fail('ASN prefix Result Missing')
	}
}

export const assertFreeAfterMiss = (createDb: () => RuntimeMaxmind) => {
	const db = createDb()
	let threw = false
	try {
		db.lookup_city(LOOKUP_FIXTURES.missingIp)
	} catch {
		threw = true
	}
	if (!threw) {
		fail('Expected not-found error')
	}
	db.free()
}
