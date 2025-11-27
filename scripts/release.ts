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

	await $`tsx scripts/changelog.ts --recreateChangelog`.nothrow();
	await $`git add CHANGELOG.md`.nothrow();
	await $`git commit -m "ci: update changelog [skip ci]"`.nothrow();

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
