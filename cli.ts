import 'zx/globals';
import { TEST_DATABASE_FILES } from './tests/fixtures.ts';

const WASM_BINDGEN_LOCK_PATTERN = /name = "wasm-bindgen"\nversion = "([^"]+)"/;

const detectCiEnvs = () => {
	const ciEnvs = [
		'CI',
		'GITHUB_ACTIONS',
		'GITHUB_RUN_ID',
		'GITHUB_RUN_NUMBER',
		'GITHUB_RUN_ATTEMPT',
	];
	for (const env of ciEnvs) {
		if (process.env[env]) {
			return true;
		}
	}
	return false;
};

const readWasmBindgenVersion = (): string => {
	const lockfile = fs.readFileSync('Cargo.lock', 'utf8');
	const match = lockfile.match(WASM_BINDGEN_LOCK_PATTERN);
	if (!match) {
		throw new Error('Could not read wasm-bindgen version from Cargo.lock');
	}
	return match[1];
};

const readInstalledWasmBindgenVersion = async (): Promise<string | null> => {
	const binPath = which('wasm-bindgen');
	if (!binPath) {
		return null;
	}
	const output = await $`wasm-bindgen --version`.nothrow().quiet();
	if (output.exitCode !== 0) {
		return null;
	}
	return String(output.stdout).trim().split(/\s+/).pop() ?? null;
};

const cliArgs = minimist(process.argv.slice(2), {
	string: [
		'target',
		'profile',
		'features',
	],
	boolean: [
		'install-bindgen',
		'build-rs',
		'build-js',
		'fetch-test-artifacts',
		'install-playwright-browser',
	],
	alias: {
		i: 'install-bindgen',
		b: 'build-rs',
		j: 'build-js',
		t: 'target',
		p: 'profile',
		f: 'fetch-test-artifacts',
		bp: 'install-playwright-browser',
	},
	default: {
		target: 'node',
		profile: 'release',
	},
});

if (cliArgs['install-bindgen'] && !detectCiEnvs()) {
	const wanted = readWasmBindgenVersion();
	const current = await readInstalledWasmBindgenVersion();
	if (current !== wanted) {
		await $`cargo install -f wasm-bindgen-cli --version ${wanted}`;
	}
}

const profile = cliArgs.profile || 'release';

if (cliArgs['build-rs']) {
	const featureArgs = cliArgs.features ? ['--features', String(cliArgs.features)] : [];
	await $`cargo build --lib --${profile} --target wasm32-unknown-unknown ${featureArgs}`;
}

if (cliArgs['build-js']) {
	const target: string = cliArgs.target || 'node';
	const targetToDir = {
		nodejs: 'node',
		web: 'browser',
		'experimental-nodejs-module': 'node-module',
		bundler: 'bundler',
		'no-modules': 'no-module',
	}[target] || 'node';
	fs.removeSync(`./${targetToDir}`);
	await $`wasm-bindgen \
	--target ${target} ./target/wasm32-unknown-unknown/${profile}/index.wasm \
	--out-dir ./${targetToDir}`;

	if (target === 'bundler') {
		const indexJs = await fs.readFile(`./${targetToDir}/index.js`, 'utf-8')
		const indexJsJSRTypePath = `/* @ts-self-types="./index.d.ts" */
${indexJs}`
		await fs.writeFile(`./${targetToDir}/index.js`, indexJsJSRTypePath)
	}
}

if (cliArgs['fetch-test-artifacts']) {
	const workspaceRoot = path.resolve();

	for (const database of TEST_DATABASE_FILES) {
		const dbFilePath = path.join(workspaceRoot, 'tests', `.${database}`);

		if (fs.existsSync(dbFilePath)) {
			console.log('DB File', database, 'already exists');
			continue;
		}

		const dbFile = await fetch(`https://github.com/maxmind/MaxMind-DB/raw/main/test-data/${database}`)
			.then(v => v.arrayBuffer())
			.then(v => new Uint8Array(v));

		await fs.writeFile(dbFilePath, dbFile);
	}
}
