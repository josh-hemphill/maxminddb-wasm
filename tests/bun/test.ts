import { test } from "bun:test";
import { Maxmind } from '../../node-module/index.js'

const dbFile = await Bun.file('../.GeoLite2-City-Test.mmdb').bytes()
const dbFileAsn = await Bun.file('../.GeoLite2-ASN-Test.mmdb').bytes()

const maxmind = new Maxmind(dbFile)
const maxmindAsn = new Maxmind(dbFileAsn)

const result = maxmind.lookup_city('2a02:d100::0001')
const resultAsn = maxmindAsn.lookup_isp('2c0f:ff80::')

let tested = false;
test(
	'Random IP Check',
	() => {
		tested = true
		result?.location?.time_zone === "Europe/Warsaw" || (() => { throw Error("Result Missing") });
		resultAsn?.asn?.as_num === 237 || (() => { throw Error("ASN Result Missing") });
	}
)

test('Check Metadata', () => {
	maxmind?.metadata?.languages?.includes('en') || (() => { throw Error("Metadata Missing") });
})
if (!Bun.env.CI) console.log(result)
