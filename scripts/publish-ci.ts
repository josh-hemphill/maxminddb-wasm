#!/usr/bin/env zx

import { readFileSync } from 'node:fs'
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

const npmVersion = (await $`npm --version`).stdout.trim()
console.log('npm', npmVersion)
if (!supportsTrustedPublishing(npmVersion)) {
	throw new Error(
		`npm ${npmVersion} cannot use trusted publishing; need >= 11.5.1`,
	)
}

// pnpm 10's publish path does not perform npm trusted-publishing OIDC.
// Node 24 ships npm >= 11.5.1, which exchanges ACTIONS_ID_TOKEN_REQUEST_*
// for a short-lived npm token. --provenance is automatic with trusted
// publishing on public repos; pass it explicitly as well.
const npmArgs = ['publish', '--access', 'public', '--provenance']
if (releaseTag) {
	npmArgs.push('--tag', releaseTag)
}
await $`npm ${npmArgs}`
await $`pnpm dlx jsr publish --allow-dirty`

/** Returns whether this npm CLI version can exchange GitHub Actions OIDC. */
function supportsTrustedPublishing(npmVersion: string) {
	const [major = 0, minor = 0, patch = 0] = npmVersion.split('.').map(Number)
	return major > 11 || (major === 11 && (minor > 5 || (minor === 5 && patch >= 1)))
}
