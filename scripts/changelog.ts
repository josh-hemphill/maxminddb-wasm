#!/usr/bin/env zx

import 'zx/globals'
import { generate, generateMarkdown, resolveConfig } from 'changelogithub'
const args = minimist(process.argv.slice(2), {
	boolean: [
		'recreateChangelog',
	],
	alias: {
		r: 'recreateChangelog',
	},
})

async function _generateChangelog(from: string, to: string) {
	try {
		const { commits } = await generate({ from, to })
		const config = await resolveConfig({ from, to })
		const md = generateMarkdown(commits, config)
		return md
	}
	catch (err) {
		console.error(err)
		return ''
	}
}

async function getTags() {
	const tags = await $`git tag --sort=-version:refname -l v*`.nothrow()
	if (tags.exitCode !== 0) {
		console.error('No tags found')
		process.exit(1)
	}
	return tags.stdout
		.trim()
		.split('\n')
		.map((version, i, arr) => ({ version, i, prev: arr[i - 1] }))
		.filter(({ version, prev }) => prev && version !== prev);
}

const run = async () => {
	try {
		if (!(args.recreateChangelog || args.r)) {
			console.log('Updating changelog')
			const [to] = await getTags();
			const md = await _generateChangelog(to.prev, to.version)
			const changelog = await fs.readFile('CHANGELOG.md', 'utf8')
			await fs.writeFile('CHANGELOG.md', `${md}\n\n${changelog}`)
			return;
		}

		console.log('Recreating changelog')
		
		let changelog = ''
		for (const tag of await getTags()) {
			console.log(`Generating changelog between ${tag.prev} and ${tag.version}`)
			const md = await _generateChangelog(tag.prev, tag.version)
			if (md) {
				changelog += `
# Release [${tag.version}](https://github.com/josh-hemphill/maxminddb-wasm/releases/tag/${tag.version})

${md}
`
			}
		}
		await fs.writeFile('CHANGELOG.md', changelog)
	}
	catch (err) {
		console.error(err)
	}
}

await run()
