import { join } from 'node:path'
import { readFileSync } from 'node:fs'
import * as wasm from '../../node/index.js'
import { registerMaxmindTests } from '../shared/maxmind-vitest.ts'

registerMaxmindTests(wasm.Maxmind, {
	city: readFileSync(join(__dirname, '..', '.GeoLite2-City-Test.mmdb')),
	asn: readFileSync(join(__dirname, '..', '.GeoLite2-ASN-Test.mmdb')),
	country: readFileSync(join(__dirname, '..', '.GeoLite2-Country-Test.mmdb')),
})
