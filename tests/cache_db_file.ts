import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { existsSync, mkdir } from 'node:fs';
import process from "node:process";

const __dirname = path.resolve();
const dbFilePath = path.join(__dirname, 'tests', '.GeoLite2-City-Test.mmdb');

if (existsSync(dbFilePath)) {
	console.log('DB File already exists');
	process.exit(0);
}

const dbFile = await fetch('https://github.com/maxmind/MaxMind-DB/raw/main/test-data/GeoLite2-City-Test.mmdb')
	.then(v => v.arrayBuffer())
	.then(v => new Uint8Array(v));

await writeFile(dbFilePath, dbFile)
