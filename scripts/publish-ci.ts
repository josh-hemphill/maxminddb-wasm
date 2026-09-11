#!/usr/bin/env zx

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import 'zx/globals'
import {
	isAlreadyPublishedError,
	publishedVersionFromNpmView,
	supportsTrustedPublishing,
} from './npm-publish-status.ts'

let version = process.argv[2]
const flags = new Set(process.argv.slice(3))
const npmOnly = flags.has('--npm-only')
const jsrOnly = flags.has('--jsr-only')

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

if (!jsrOnly) {
	await publishNpm(pkg.name, version, releaseTag)
}
if (!npmOnly) {
	await publishJsr()
}

/** Publishes to npm via trusted-publisher OIDC, or skips if the version exists. */
async function publishNpm(
	name: string,
	packageVersion: string,
	distTag: string | undefined,
) {
	if (await isNpmVersionPublished(name, packageVersion)) {
		console.log(`npm ${name}@${packageVersion} already published, skipping`)
		return
	}

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
	if (distTag) {
		npmArgs.push('--tag', distTag)
	}
	try {
		await $`npm ${npmArgs}`
	}
	catch (error) {
		if (isAlreadyPublishedError(error)) {
			console.log(`npm ${name}@${packageVersion} already published, skipping`)
			return
		}
		throw error
	}
}

/** Publishes to JSR using OIDC, or JSR_TOKEN when that secret is set. */
async function publishJsr() {
	const token = process.env.JSR_TOKEN
	if (token) {
		await $`pnpm dlx jsr publish --allow-dirty --token ${token}`
		return
	}
	await $`pnpm dlx jsr publish --allow-dirty`
}

/** Returns whether this version is already on the npm registry. */
async function isNpmVersionPublished(name: string, packageVersion: string) {
	const result = await $`npm view ${name}@${packageVersion} version`.nothrow()
	if (result.exitCode !== 0) {
		return false
	}
	return publishedVersionFromNpmView(result.stdout) === packageVersion
}
