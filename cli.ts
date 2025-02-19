import 'zx/globals';

const detectCiEnvs = () => {
	const ciEnvs = [
		'CI',
		'GITHUB_ACTIONS',
		'GITHUB_RUN_ID',
		'GITHUB_RUN_NUMBER',
		'GITHUB_RUN_ATTEMPT',
		'GITHUB_RUN_ID',
	];
	for (const env of ciEnvs) {
		if (process.env[env]) {
			return true;
		}
	}
	return false;
};

const cliArgs = minimist(process.argv.slice(2), {
	string: [
		'target',
		'profile',
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

if (cliArgs['install-bindgen']) {
	const binPath = which('wasm-bindgen');
	if (!binPath && !detectCiEnvs()) {
		$`cargo install -f wasm-bindgen-cli`;
	}
}

const profile = cliArgs.profile || 'release';

if (cliArgs['build-rs']) {
	$`cargo build --lib --${profile} --target wasm32-unknown-unknown`;
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
	const __dirname = path.resolve();
	const dbFilePath = path.join(__dirname, 'tests', '.GeoLite2-City-Test.mmdb');

	if (fs.existsSync(dbFilePath)) {
		console.log('DB File already exists');
	} else {

		const dbFile = await fetch('https://github.com/maxmind/MaxMind-DB/raw/main/test-data/GeoLite2-City-Test.mmdb')
			.then(v => v.arrayBuffer())
			.then(v => new Uint8Array(v));

		await fs.writeFile(dbFilePath, dbFile)
	}
}
