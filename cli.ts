import 'zx/globals';

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
	const isWindows = process.platform === 'win32';
	if (isWindows) {
		$`where wasm-bindgen >nul 2>nul || cargo install -f wasm-bindgen-cli`;
	} else {
		$`command -v wasm-bindgen >/dev/null 2>&1 || cargo install -f wasm-bindgen-cli`;
	}
}

const profile = cliArgs.profile || 'release';

const packageName = fs.readFileSync('cargo.toml', 'utf8').match(/name = "(.*)"/)?.[1] || 'wasm_maxminddb';
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
	--target ${target} ./target/wasm32-unknown-unknown/${profile}/${packageName}.wasm \
	--out-dir ./${targetToDir}`;
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
