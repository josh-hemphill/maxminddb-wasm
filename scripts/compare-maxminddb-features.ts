import 'zx/globals'
import { pathToFileURL } from 'node:url'
import { gzipSync } from 'node:zlib'
import { LOOKUP_FIXTURES } from '../tests/fixtures.ts'

const COMPARE_DIR = '/tmp/maxmind-feature-compare'
const LOOKUP_ITERS = 8_000
const WARMUP_ITERS = 200
const TIMING_SAMPLES = 5
const ARTIFACT_JSON = '/opt/cursor/artifacts/maxminddb_features_compare.json'
const ARTIFACT_MD = '/opt/cursor/artifacts/maxminddb_features_compare.md'
const BUN_BIN = path.resolve('tests/bun/node_modules/.bin/bun')
const WORKSPACE = path.resolve()

type LookupSnapshot = {
	cityIpv6: unknown
	cityIpv4: unknown
	country: unknown
	asn: unknown
}

type EngineRun = {
	engine: string
	ok: boolean
	error?: string
	lookups?: LookupSnapshot
	cityLookupMs: number | null
	lookupsPerSec: number | null
	samplesMs?: number[]
}

type VariantBuild = {
	name: string
	features: string
	notes: string
	wasmBytes: number | null
	wasmGzipBytes: number | null
	nodeModuleDir: string
	error?: string
}

type VariantSpec = {
	name: string
	features: string[]
	rustflags?: string
	notes: string
}

const VARIANTS: VariantSpec[] = [
	{
		name: 'default',
		features: [],
		notes: 'Current crate: std UTF-8 checks, dlmalloc, no maxminddb extras',
	},
	{
		name: 'simdutf8',
		features: ['simdutf8'],
		notes: 'maxminddb/simdutf8 without wasm SIMD (+simd128)',
	},
	{
		name: 'simdutf8-simd128',
		features: ['simdutf8'],
		rustflags: '-C target-feature=+simd128',
		notes: 'maxminddb/simdutf8 with wasm SIMD128',
	},
	{
		name: 'unsafe-str-decode',
		features: ['unsafe-str-decode'],
		notes: 'maxminddb/unsafe-str-decode skips UTF-8 validation',
	},
]

const gzipSize = async (filePath: string) => {
	const bytes = await fs.readFile(filePath)
	return gzipSync(bytes, { level: 9 }).length
}

const bindgenTarget = async (wasmPath: string, outDir: string) => {
	await fs.remove(outDir)
	await fs.mkdirp(outDir)
	await $`wasm-bindgen --target experimental-nodejs-module ${wasmPath} --out-dir ${outDir}`
}

const buildVariant = async (spec: VariantSpec): Promise<VariantBuild> => {
	const cargoFeatures = spec.features.length > 0 ? ['--features', spec.features.join(',')] : []
	const targetDir = path.join(COMPARE_DIR, 'target', spec.name)
	const env = {
		...process.env,
		CARGO_TARGET_DIR: targetDir,
		...(spec.rustflags ? { RUSTFLAGS: spec.rustflags } : {}),
	}
	await $({ env })`cargo build --lib --release --target wasm32-unknown-unknown ${cargoFeatures}`
	const wasmPath = path.join(targetDir, 'wasm32-unknown-unknown/release/index.wasm')
	const nodeModuleDir = path.join(COMPARE_DIR, spec.name, 'node-module')
	await bindgenTarget(wasmPath, nodeModuleDir)
	const wasmFile = path.join(nodeModuleDir, 'index_bg.wasm')
	return {
		name: spec.name,
		features: spec.features.join(',') || '(none)',
		notes: spec.notes,
		wasmBytes: (await fs.stat(wasmFile)).size,
		wasmGzipBytes: await gzipSize(wasmFile),
		nodeModuleDir,
	}
}

const validateLookups = (lookups: LookupSnapshot) => {
	const cityIpv6 = lookups.cityIpv6 as { location?: { time_zone?: string }; country?: { iso_code?: string } }
	const cityIpv4 = lookups.cityIpv4 as { country?: { iso_code?: string } }
	const country = lookups.country as { country?: { iso_code?: string }; continent?: { code?: string } }
	const asn = lookups.asn as { asn?: { as_num?: number } }
	const failures: string[] = []
	if (cityIpv6?.location?.time_zone !== LOOKUP_FIXTURES.cityIpv6.timeZone) {
		failures.push(`cityIpv6 timezone ${cityIpv6?.location?.time_zone}`)
	}
	if (cityIpv4?.country?.iso_code !== LOOKUP_FIXTURES.cityIpv4.countryIso) {
		failures.push(`cityIpv4 country ${cityIpv4?.country?.iso_code}`)
	}
	if (country?.country?.iso_code !== LOOKUP_FIXTURES.country.iso) {
		failures.push(`country iso ${country?.country?.iso_code}`)
	}
	if (country?.continent?.code !== LOOKUP_FIXTURES.country.continent) {
		failures.push(`continent ${country?.continent?.code}`)
	}
	if (asn?.asn?.as_num !== LOOKUP_FIXTURES.asn.asNum) {
		failures.push(`asn ${asn?.asn?.as_num}`)
	}
	return failures
}

const writeGlueRunner = async () => {
	const runnerPath = path.join(COMPARE_DIR, 'run-lookups.mjs')
	await fs.writeFile(runnerPath, `import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

const glue = process.env.MAXMIND_GLUE
const cityPath = process.env.CITY_DB
const countryPath = process.env.COUNTRY_DB
const asnPath = process.env.ASN_DB
const lookupIters = Number(process.env.LOOKUP_ITERS)
const warmupIters = Number(process.env.WARMUP_ITERS)
const samples = Number(process.env.TIMING_SAMPLES)

const { Maxmind } = await import(pathToFileURL(glue).href)

const run = async () => {
	try {
		const city = new Maxmind(await readFile(cityPath))
		const country = new Maxmind(await readFile(countryPath))
		const asn = new Maxmind(await readFile(asnPath))
		const lookups = {
			cityIpv6: city.lookup_city(${JSON.stringify(LOOKUP_FIXTURES.cityIpv6.ip)}),
			cityIpv4: city.lookup_city(${JSON.stringify(LOOKUP_FIXTURES.cityIpv4.ip)}),
			country: country.lookup_country(${JSON.stringify(LOOKUP_FIXTURES.country.ip)}),
			asn: asn.lookup_isp(${JSON.stringify(LOOKUP_FIXTURES.asn.ip)}),
		}
		for (let i = 0; i < warmupIters; i++) {
			city.lookup_city(${JSON.stringify(LOOKUP_FIXTURES.cityIpv6.ip)})
		}
		const samplesMs = []
		for (let sample = 0; sample < samples; sample++) {
			const start = performance.now()
			for (let i = 0; i < lookupIters; i++) {
				city.lookup_city(${JSON.stringify(LOOKUP_FIXTURES.cityIpv6.ip)})
			}
			samplesMs.push(performance.now() - start)
		}
		city.free()
		country.free()
		asn.free()
		const cityLookupMs = samplesMs.slice().sort((a, b) => a - b)[Math.floor(samplesMs.length / 2)]
		console.log(JSON.stringify({
			ok: true,
			lookups,
			cityLookupMs,
			lookupsPerSec: lookupIters / (cityLookupMs / 1000),
			samplesMs,
		}))
	} catch (error) {
		console.log(JSON.stringify({
			ok: false,
			error: error instanceof Error ? \`\${error.name}: \${error.message}\` : String(error),
		}))
	}
}

await run()
`)
	return runnerPath
}

const runGlueEngine = async (engine: string, bin: string, glueDir: string, runnerPath: string): Promise<EngineRun> => {
	const env = {
		...process.env,
		MAXMIND_GLUE: path.join(glueDir, 'index.js'),
		CITY_DB: path.join(WORKSPACE, 'tests/.GeoLite2-City-Test.mmdb'),
		COUNTRY_DB: path.join(WORKSPACE, 'tests/.GeoLite2-Country-Test.mmdb'),
		ASN_DB: path.join(WORKSPACE, 'tests/.GeoLite2-ASN-Test.mmdb'),
		LOOKUP_ITERS: String(LOOKUP_ITERS),
		WARMUP_ITERS: String(WARMUP_ITERS),
		TIMING_SAMPLES: String(TIMING_SAMPLES),
	}
	try {
		const output = await $({ env })`${bin} ${runnerPath}`.quiet()
		return { engine, ...JSON.parse(String(output.stdout)) }
	}
	catch (error) {
		const stdout = error && typeof error === 'object' && 'stdout' in error ? String((error as { stdout: unknown }).stdout) : ''
		if (stdout.trim().startsWith('{')) {
			return { engine, ...JSON.parse(stdout) }
		}
		return {
			engine,
			ok: false,
			error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
			cityLookupMs: null,
			lookupsPerSec: null,
		}
	}
}

const tryMmapWasmBuild = async () => {
	const targetDir = path.join(COMPARE_DIR, 'target', 'mmap')
	const output = await $({
		env: { ...process.env, CARGO_TARGET_DIR: targetDir },
	})`cargo check --lib --target wasm32-unknown-unknown --features mmap`.nothrow()
	return {
		ok: output.exitCode === 0,
		stderr: String(output.stderr).slice(-1200),
	}
}

await fs.mkdirp(COMPARE_DIR)
const runnerPath = await writeGlueRunner()

const mmapCheck = await tryMmapWasmBuild()
const variants: VariantBuild[] = []
for (const spec of VARIANTS) {
	variants.push(await buildVariant(spec))
}

const bunVersion = await fs.pathExists(BUN_BIN)
	? String((await $`${BUN_BIN} --version`.quiet()).stdout).trim()
	: null

type Row = {
	variant: VariantBuild
	lookupErrors: string[]
	node: EngineRun
	bun: EngineRun | null
}

const rows: Row[] = []
for (const variant of variants) {
	const node = await runGlueEngine('node', process.execPath, variant.nodeModuleDir, runnerPath)
	const bun = bunVersion
		? await runGlueEngine('bun', BUN_BIN, variant.nodeModuleDir, runnerPath)
		: null
	const lookupErrors = node.lookups ? validateLookups(node.lookups) : [`node failed: ${node.error}`]
	rows.push({ variant, lookupErrors, node, bun })
}

const baseline = rows.find((row) => row.variant.name === 'default')
const deltaPct = (value: number | null | undefined, base: number | null | undefined) => {
	if (value == null || base == null || base === 0) {
		return 'n/a'
	}
	const pct = ((value - base) / base) * 100
	const sign = pct > 0 ? '+' : ''
	return `${sign}${pct.toFixed(2)}%`
}

const fmt = (n: number | null | undefined) => n == null ? 'n/a' : n.toLocaleString(undefined, { maximumFractionDigits: 1 })

const table = [
	'| Variant | WASM bytes | gzip -9 | vs default size | Node lookups/s | vs default | Bun lookups/s | vs default | Lookups OK |',
	'| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |',
	...rows.map((row) => {
		const sizeOk = row.lookupErrors.length === 0 ? 'yes' : row.lookupErrors.join('; ')
		return `| ${row.variant.name} | ${fmt(row.variant.wasmBytes)} | ${fmt(row.variant.wasmGzipBytes)} | ${deltaPct(row.variant.wasmBytes, baseline?.variant.wasmBytes)} | ${fmt(row.node.lookupsPerSec)} | ${deltaPct(row.node.lookupsPerSec, baseline?.node.lookupsPerSec)} | ${fmt(row.bun?.lookupsPerSec)} | ${deltaPct(row.bun?.lookupsPerSec, baseline?.bun?.lookupsPerSec)} | ${sizeOk} |`
	}),
].join('\n')

const report = {
	generatedAt: new Date().toISOString(),
	maxminddb: '0.31.0',
	lookupIters: LOOKUP_ITERS,
	warmupIters: WARMUP_ITERS,
	timingSamples: TIMING_SAMPLES,
	node: { version: process.version, v8: process.versions.v8 },
	bun: bunVersion,
	mmapWasm: mmapCheck,
	rows: rows.map((row) => ({
		name: row.variant.name,
		features: row.variant.features,
		notes: row.variant.notes,
		wasmBytes: row.variant.wasmBytes,
		wasmGzipBytes: row.variant.wasmGzipBytes,
		lookupErrors: row.lookupErrors,
		node: {
			ok: row.node.ok,
			cityLookupMs: row.node.cityLookupMs,
			lookupsPerSec: row.node.lookupsPerSec,
			samplesMs: row.node.samplesMs,
			error: row.node.error,
		},
		bun: row.bun && {
			ok: row.bun.ok,
			cityLookupMs: row.bun.cityLookupMs,
			lookupsPerSec: row.bun.lookupsPerSec,
			samplesMs: row.bun.samplesMs,
			error: row.bun.error,
		},
	})),
}

const markdown = `# maxminddb 0.31 optional features (WASM)

Measured \`lookup_city\` on the GeoLite2 City test DB (${LOOKUP_ITERS.toLocaleString()} iterations, median of ${TIMING_SAMPLES} samples after ${WARMUP_ITERS} warmup). Release profile is \`opt-level = "s"\`.

${table}

## Feature notes

- **mmap**: native \`memmap2\` file mapping. This wrapper already loads the DB as \`Uint8Array\` into \`Reader<Vec<u8>>\`. WASM check: ${mmapCheck.ok ? 'compiled' : 'did not compile'}.
- **simdutf8**: SIMD UTF-8 validation. Mutually exclusive with \`unsafe-str-decode\`.
- **unsafe-str-decode**: skip UTF-8 validation (~20% faster on native according to maxminddb docs). Safe only for trusted MaxMind files.
- **talc**: this crate's optional allocator, not a maxminddb feature. Prior compare showed ~1% size win and similar speed.

## mmap compile log (truncated)

\`\`\`
${mmapCheck.stderr || '(success)'}
\`\`\`
`

await fs.mkdirp('/opt/cursor/artifacts')
await fs.writeJson(ARTIFACT_JSON, report, { spaces: 2 })
await fs.writeFile(ARTIFACT_MD, markdown)
console.log(markdown)
console.log(`wrote ${ARTIFACT_JSON}`)
