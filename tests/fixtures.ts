export const TEST_DATABASE_FILES = [
	'GeoLite2-City-Test.mmdb',
	'GeoLite2-ASN-Test.mmdb',
	'GeoLite2-Country-Test.mmdb',
] as const

export const LOOKUP_FIXTURES = {
	cityIpv6: {
		ip: '2a02:d100::0001',
		timeZone: 'Europe/Warsaw',
	},
	cityIpv4: {
		ip: '81.2.69.142',
		countryIso: 'GB',
	},
	country: {
		ip: '2.125.160.216',
		iso: 'GB',
		continent: 'EU',
	},
	asn: {
		ip: '2c0f:ff80::',
		asNum: 237,
		org: 'Merit Network Inc.',
	},
	missingIp: '127.0.0.1',
	invalidIp: 'not-an-ip',
} as const

export const LOOKUP_ERRORS = {
	invalidIp: /Invalid IP/,
	notFound: /Result Not Found/,
	invalidDatabase: /Invalid Database Binary/,
} as const

export const toUint8Array = (data: unknown): Uint8Array => {
	if (data instanceof Uint8Array) {
		return data
	}
	if (data instanceof ArrayBuffer) {
		return new Uint8Array(data)
	}
	if (ArrayBuffer.isView(data)) {
		return new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
	}
	if (typeof data === 'string') {
		const bytes = new Uint8Array(data.length)
		for (let i = 0; i < data.length; i++) {
			bytes[i] = data.charCodeAt(i) & 0xff
		}
		return bytes
	}
	throw new Error('Unsupported database file contents')
}
