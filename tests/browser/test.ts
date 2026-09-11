import { server } from 'vitest/browser'
import init, { Maxmind } from '../../browser/index.js'
import { toUint8Array } from '../fixtures.ts'
import { registerMaxmindTests } from '../shared/maxmind-vitest.ts'

const { readFile } = server.commands

const asBytes = async (relativePath: string) =>
	toUint8Array(await readFile(relativePath, 'binary'))

await init()

registerMaxmindTests(Maxmind, {
	city: await asBytes('../.GeoLite2-City-Test.mmdb'),
	asn: await asBytes('../.GeoLite2-ASN-Test.mmdb'),
	country: await asBytes('../.GeoLite2-Country-Test.mmdb'),
})
