import { test } from "bun:test";
import { Maxmind } from '../../node-module/index.js'
import {
	assertAsnLookup,
	assertCityLookups,
	assertCountryLookup,
	assertFreeAfterMiss,
} from '../shared/assert-lookups.ts'

const dbFile = await Bun.file('../.GeoLite2-City-Test.mmdb').bytes()
const dbFileAsn = await Bun.file('../.GeoLite2-ASN-Test.mmdb').bytes()
const dbFileCountry = await Bun.file('../.GeoLite2-Country-Test.mmdb').bytes()

const maxmind = new Maxmind(dbFile)
const maxmindAsn = new Maxmind(dbFileAsn)
const maxmindCountry = new Maxmind(dbFileCountry)

test('City lookups', () => {
	assertCityLookups(maxmind)
})

test('Country lookup', () => {
	assertCountryLookup(maxmindCountry)
})

test('ASN lookup', () => {
	assertAsnLookup(maxmindAsn)
})

test('free after not-found lookup', () => {
	assertFreeAfterMiss(() => new Maxmind(dbFile))
})
