import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { existsSync } from 'node:fs';
import process from "node:process";
import { TEST_DATABASE_FILES } from './fixtures.ts';

const workspaceRoot = path.resolve();

for (const database of TEST_DATABASE_FILES) {
	const dbFilePath = path.join(workspaceRoot, 'tests', `.${database}`);

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
