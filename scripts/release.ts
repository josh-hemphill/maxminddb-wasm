#!/usr/bin/env zx

import 'zx/globals'
import { versionBump } from 'bumpp'

try {
	const packages = await glob(['package.json', 'jsr.json'], { expandDirectories: false })

	console.log('Bumping versions in packages:', packages.join(', '), '\n')

	const result = await versionBump({
		files: packages,
		commit: 'ci: release v%s',
		push: false,
		tag: true,
		all: true,
	})

	await $`tsx scripts/changelog.ts --recreateChangelog`
	await $`git add CHANGELOG.md`
	await $`git commit -m "ci: update changelog"`

	const latestTagExists = await $`git tag -l latest`.nothrow()
	if (latestTagExists) {
		await $`git tag -d latest`
		await $`git push origin :refs/tags/latest`
	}
	await $`git tag latest`

	if (!result.newVersion.includes('beta')) {
		console.log('Pushing to release branch')
		await $`git update-ref refs/heads/release refs/heads/dev`
		await $`git push origin release`
	}
	await $`git push origin dev --tags`
	console.log('New release is ready, waiting for conformation at https://github.com/josh-hemphill/maxminddb-wasm/actions')
}
catch (err) {
	console.error(err)
}
