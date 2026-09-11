import { join } from 'node:path'
import { readFile } from 'node:fs/promises'
import { Maxmind } from '../../node-module/index.js'
import { registerMaxmindTests } from '../shared/maxmind-vitest.ts'

const testsDir = join(import.meta.dirname, '..')

registerMaxmindTests(Maxmind, {
	city: await readFile(join(testsDir, '.GeoLite2-City-Test.mmdb')),
	asn: await readFile(join(testsDir, '.GeoLite2-ASN-Test.mmdb')),
	country: await readFile(join(testsDir, '.GeoLite2-Country-Test.mmdb')),
})
