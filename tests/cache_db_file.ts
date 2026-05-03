import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { existsSync } from 'node:fs';
import process from "node:process";

const __dirname = path.resolve();
const databases = [
	'GeoLite2-City-Test.mmdb',
	'GeoLite2-ASN-Test.mmdb',
];

for (const database of databases) {
	const dbFilePath = path.join(__dirname, 'tests', `.${database}`);

	if (existsSync(dbFilePath)) {
		console.log('DB File', database, 'already exists');
		continue;
	}

	const dbFile = await fetch(`https://github.com/maxmind/MaxMind-DB/raw/main/test-data/${database}`)
		.then(v => v.arrayBuffer())
		.then(v => new Uint8Array(v));

	await writeFile(dbFilePath, dbFile)
}

process.exit(0);
