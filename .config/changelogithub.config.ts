import type { ChangelogenOptions } from 'changelogithub'

export default {
	types: {
		feat: { title: '🚀 Features' },
		fix: { title: '🐞 Bug Fixes' },
		perf: { title: '🏎 Performance' },
		docs: { title: '📚 Documentation' },
		style: { title: '🎨 Style' },
		refactor: { title: '🔄 Refactor' },
		build: { title: '🔄 Build' },
		chore: { title: '🧰 Miscellaneous' },
	},
} satisfies Partial<ChangelogenOptions>
