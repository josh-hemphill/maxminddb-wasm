import { test } from "bun:test";
import { Maxmind } from '../../node-module/index.js'

const dbFile = await Bun.file('../.GeoLite2-City-Test.mmdb').bytes()
const dbFileAsn = await Bun.file('../.GeoLite2-ASN-Test.mmdb').bytes()
const dbFileCountry = await Bun.file('../.GeoLite2-Country-Test.mmdb').bytes()

const maxmind = new Maxmind(dbFile)
const maxmindAsn = new Maxmind(dbFileAsn)
const maxmindCountry = new Maxmind(dbFileCountry)

const result = maxmind.lookup_city('2a02:d100::0001')
const resultAsn = maxmindAsn.lookup_isp('2c0f:ff80::')
const resultCountry = maxmindCountry.lookup_country('2.125.160.216')

let tested = false;
test(
	'Random IP Check',
	() => {
		tested = true
		result?.location?.time_zone === "Europe/Warsaw" || (() => { throw Error("Result Missing") });
		resultAsn?.asn?.as_num === 237 || (() => { throw Error("ASN Result Missing") });
		resultCountry?.country?.iso_code === "GB" || (() => { throw Error("Country Result Missing") });
	}
)

test('Check Metadata', () => {
	maxmind?.metadata?.languages?.includes('en') || (() => { throw Error("Metadata Missing") });
})

test('free after not-found lookup', () => {
	const db = new Maxmind(dbFile)
	let threw = false
	try {
		db.lookup_city('127.0.0.1')
	} catch {
		threw = true
	}
	if (!threw) throw Error('Expected not-found error')
	db.free()
})
if (!Bun.env.CI) console.log(result)
