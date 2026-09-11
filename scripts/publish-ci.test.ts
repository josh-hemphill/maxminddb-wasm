import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
	isAlreadyPublishedError,
	publishedVersionFromNpmView,
	supportsTrustedPublishing,
} from './npm-publish-status.ts'

test('publishedVersionFromNpmView reads a clean version', () => {
	assert.equal(publishedVersionFromNpmView('2.2.0\n'), '2.2.0')
})

test('publishedVersionFromNpmView ignores npm warning lines', () => {
	assert.equal(
		publishedVersionFromNpmView('npm warn Unknown env config "verify-deps-before-run"\n2.2.0\n'),
		'2.2.0',
	)
})

test('isAlreadyPublishedError matches npm republish 403', () => {
	const error = new Error(
		'npm error code E403\nnpm error 403 Forbidden - You cannot publish over the previously published versions: 2.2.0',
	)
	assert.equal(isAlreadyPublishedError(error), true)
})

test('isAlreadyPublishedError ignores unrelated failures', () => {
	assert.equal(isAlreadyPublishedError(new Error('ENEEDAUTH')), false)
})

test('supportsTrustedPublishing requires npm 11.5.1', () => {
	assert.equal(supportsTrustedPublishing('10.9.7'), false)
	assert.equal(supportsTrustedPublishing('11.5.0'), false)
	assert.equal(supportsTrustedPublishing('11.5.1'), true)
	assert.equal(supportsTrustedPublishing('11.19.1'), true)
})
