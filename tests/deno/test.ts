import { join } from 'jsr:@std/path'
import { Maxmind } from '../../bundler/index.js'
import {
	assertAsnLookup,
	assertCityLookups,
	assertCountryLookup,
	assertFreeAfterMiss,
} from '../shared/assert-lookups.ts'

const dbFile = await Deno.readFile(join(Deno.cwd(), '..', '.GeoLite2-City-Test.mmdb'))
const dbFileAsn = await Deno.readFile(join(Deno.cwd(), '..', '.GeoLite2-ASN-Test.mmdb'))
const dbFileCountry = await Deno.readFile(join(Deno.cwd(), '..', '.GeoLite2-Country-Test.mmdb'))

const maxmind = new Maxmind(dbFile)
const maxmindAsn = new Maxmind(dbFileAsn)
const maxmindCountry = new Maxmind(dbFileCountry)

Deno.test({
	name: 'City lookups',
	fn: () => {
		assertCityLookups(maxmind)
	}
})

Deno.test({
	name: 'Country lookup',
	fn: () => {
		assertCountryLookup(maxmindCountry)
	}
})

Deno.test({
	name: 'ASN lookup',
	fn: () => {
		assertAsnLookup(maxmindAsn)
	}
})

Deno.test({
	name: 'free after not-found lookup',
	fn: () => {
		assertFreeAfterMiss(() => new Maxmind(dbFile))
	}
})
