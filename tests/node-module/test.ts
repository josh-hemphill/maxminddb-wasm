import { join } from 'node:path'
import { test, describe, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'

import { Maxmind } from '../../node-module/index.js'

const dbFile = await readFile(join(__dirname, '..', '.GeoLite2-City-Test.mmdb'))


describe('Maxmind DB', () => {
	const maxmind = new Maxmind(dbFile)

	const result = maxmind.lookup_city('2a02:d100::0001')

	it('should return the correct result', () => {
		expect(result).toBeDefined()
		expect(result?.location?.time_zone).toBe("Europe/Warsaw")
	})
	it('db should have the correct metadata', () => {
		expect(maxmind?.metadata?.languages?.includes('en')).toBe(true)
	})
})

