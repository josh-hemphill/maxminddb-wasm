import { join } from 'jsr:@std/path'
import { Maxmind } from '../../bundler/index.js'

const dbFile = await Deno.readFile(join(Deno.cwd(), '..', '.GeoLite2-City-Test.mmdb'))
const dbFile_AS = await Deno.readFile(join(Deno.cwd(), '..', '.GeoLite2-ASN-Test.mmdb'))

const maxmind = new Maxmind(dbFile)
const maxmind_AS = new Maxmind(dbFile_AS)

const result = maxmind.lookup_city('2a02:d100::0001')
const result_AS = maxmind_AS.lookup_isp('2c0f:ff80::')

let tested = false;
Deno.test({
	name: 'Random IP Check',
	fn: () => {
		tested = true
		result?.location?.time_zone === "Europe/Warsaw" || (() => { throw Error("Result Missing") });
		result_AS?.asn?.as_num === 237 || (() => { throw Error("Result Missing") });
	}
})

Deno.test({
	name: 'Check Metadata',
	fn: () => {
		maxmind?.metadata?.languages?.includes('en') || (() => { throw Error("Metadata Missing") });
	}
})
if (!Deno.env.get('CI')) console.log(result)
