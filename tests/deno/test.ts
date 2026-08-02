import { join } from 'jsr:@std/path'
import { Maxmind } from '../../bundler/index.js'

const dbFile = await Deno.readFile(join(Deno.cwd(), '..', '.GeoLite2-City-Test.mmdb'))
const dbFileAsn = await Deno.readFile(join(Deno.cwd(), '..', '.GeoLite2-ASN-Test.mmdb'))
const dbFileCountry = await Deno.readFile(join(Deno.cwd(), '..', '.GeoLite2-Country-Test.mmdb'))

const maxmind = new Maxmind(dbFile)
const maxmindAsn = new Maxmind(dbFileAsn)
const maxmindCountry = new Maxmind(dbFileCountry)

const result = maxmind.lookup_city('2a02:d100::0001')
const resultAsn = maxmindAsn.lookup_isp('2c0f:ff80::')
const resultCountry = maxmindCountry.lookup_country('2.125.160.216')

let tested = false;
Deno.test({
	name: 'Random IP Check',
	fn: () => {
		tested = true
		result?.location?.time_zone === "Europe/Warsaw" || (() => { throw Error("Result Missing") });
		resultAsn?.asn?.as_num === 237 || (() => { throw Error("ASN Result Missing") });
		resultCountry?.country?.iso_code === "GB" || (() => { throw Error("Country Result Missing") });
	}
})

Deno.test({
	name: 'Check Metadata',
	fn: () => {
		maxmind?.metadata?.languages?.includes('en') || (() => { throw Error("Metadata Missing") });
	}
})

Deno.test({
	name: 'free after not-found lookup',
	fn: () => {
		const db = new Maxmind(dbFile)
		let threw = false
		try {
			db.lookup_city('127.0.0.1')
		} catch {
			threw = true
		}
		if (!threw) throw Error('Expected not-found error')
		db.free()
	}
})
if (!Deno.env.get('CI')) console.log(result)
