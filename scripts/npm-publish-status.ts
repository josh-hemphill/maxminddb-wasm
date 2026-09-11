/** Reads the version from `npm view <pkg>@<version> version` stdout. */
export function publishedVersionFromNpmView(stdout: string) {
	const lines = stdout
		.trim()
		.split('\n')
		.map(line => line.trim())
		.filter(line => line && !line.startsWith('npm '))
	return lines.at(-1)
}

/** Returns whether npm rejected a publish because the version already exists. */
export function isAlreadyPublishedError(error: unknown) {
	const text = error instanceof Error ? error.message : String(error)
	return /cannot publish over|previously published versions|EPUBLISHCONFLICT/i.test(
		text,
	)
}

/** Returns whether this npm CLI version can exchange GitHub Actions OIDC. */
export function supportsTrustedPublishing(npmVersion: string) {
	const [major = 0, minor = 0, patch = 0] = npmVersion.split('.').map(Number)
	return major > 11 || (major === 11 && (minor > 5 || (minor === 5 && patch >= 1)))
}
