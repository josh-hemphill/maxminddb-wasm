import { expect, test } from "bun:test";
import { Maxmind } from '../../node-module/index.js'

const dbFile = await Bun.file('../.GeoLite2-City-Test.mmdb').bytes()

const maxmind = new Maxmind(dbFile)

const result = maxmind.lookup_city('2a02:d100::0001')

let tested = false;
test(
	'Random IP Check',
	() => {
		tested = true
		result?.location?.time_zone === "Europe/Warsaw" || (() => { throw Error("Result Missing") });
	}
)

test('Check Metadata', () => {
	maxmind?.metadata?.languages?.includes('en') || (() => { throw Error("Metadata Missing") });
})
if (!Bun.env.CI) console.log(result)
