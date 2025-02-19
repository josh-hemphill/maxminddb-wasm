import 'zx/globals';
import { makeBadge } from 'badge-maker'
const testSummary = fs.readJsonSync('./pnpm-exec-summary.json') as typeof import('../pnpm-exec-summary.json');
const degraded: string[] = [];
let comment = '### Test Results\n\n';
comment += '| Test Suite | Status |\n';
comment += '|------------|---------|\n';
Object.entries(testSummary.executionStatus).map(([pathName, status]) => {
	const name = pathName.split(path.sep).pop();
	const simpleStatus = status.status === 'passed' ? 'pass' :
		status.status === 'skipped' ? 'skip' :
			status.status === 'failure' ? 'fail' :
				status.status;
	return {
		label: name,
		message: simpleStatus,
		color: status.status === 'passed' ? 'green' : 'red',
		style: 'flat-square' as const,
		logoBase64: logos[name as keyof typeof logos] || undefined
	};
}).forEach((spec) => {
	const svg = makeBadge(spec);
	const statPath = `.github/badges/test-stats-${spec.label}.json`;
	const oldStat = fs.readJsonSync(statPath, { throws: false }) as Partial<typeof spec>;
	/* if (oldStat?.message === spec.message) {
		return;
	} */
	if (oldStat?.message === 'pass' && spec.message !== 'pass' && spec.label) {
		degraded.push(spec.label);
	}
	fs.ensureDirSync(path.dirname(statPath));
	fs.writeFileSync(statPath, JSON.stringify(spec, null, 2));
	fs.writeFileSync(`.github/badges/test-${spec.label}.svg`, svg);
	const statusEmoji = spec.message === 'passed' ? '✅' : '❌';
	comment += `| ${spec.label} | ${statusEmoji} ${spec.message} |\n`;
});
if (degraded.length > 0) {
	throw new Error(`The following tests have degraded: ${degraded.join(', ')}`);
}
fs.writeFileSync('test-results.txt', comment);
