#!/usr/bin/env zx

import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import 'zx/globals'

let version = process.argv[2]

if (!version) {
	throw new Error('No tag specified')
}

if (version.startsWith('v')) {
	version = version.slice(1)
}

const pkgPath = fileURLToPath(new URL('../package.json', import.meta.url))
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))

if (pkg.version !== version) {
	throw new Error(
		`Package version from tag "${version}" mismatches with the current version "${pkg.version}"`,
	)
}

const releaseTag = version.includes('beta')
	? 'beta'
	: version.includes('alpha')
		? 'alpha'
		: undefined

console.log('Publishing version', version, 'with tag', releaseTag || 'latest')

const npmToken = process.env.NODE_AUTH_TOKEN
if (!npmToken) {
	throw new Error('NODE_AUTH_TOKEN is not set')
}
// pnpm 10 will not expand env vars in a project .npmrc.
fs.appendFileSync(join(homedir(), '.npmrc'), `\n//registry.npmjs.org/:_authToken=${npmToken}\n`)

if (releaseTag) {
	await $`pnpm publish --access public --no-git-checks --tag ${releaseTag}`
}
else {
	await $`pnpm publish --access public --no-git-checks`
}
await $`pnpm dlx jsr publish --allow-dirty`
