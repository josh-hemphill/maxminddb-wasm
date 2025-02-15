import 'zx/globals';
import * as recast from 'recast';
import * as types from 'ast-types';
import * as acornParser from 'recast/parsers/acorn';
const b = types.builders;

const ast = recast.parse(fs.readFileSync('browser/index.js', 'utf8'), {
	parser: {
		parse: (code: string) => {
			return acornParser.parse(code, {
				ecmaVersion: 'latest',
				sourceType: 'module',
			});
		},
	},
});

{
	const wasmBlob = fs.readFileSync('browser/index_bg.wasm').toString('base64');

	ast.program.body.forEach((node: types.ASTNode) => {
		if (types.namedTypes.VariableDeclaration.check(node)
			&& node.kind === 'let'
			&& node.declarations.length === 1
			&& types.namedTypes.VariableDeclarator.check(node.declarations[0])
			&& types.namedTypes.Identifier.check(node.declarations[0].id)
			&& node.declarations[0].id.name === 'wasm'
		) {
			const dec = node.declarations[0];
			dec.init = b.callExpression(
				b.memberExpression(
					b.identifier('Uint8Array'),
					b.identifier('from')
				),
				[
					b.callExpression(b.identifier('atob'), [b.stringLiteral(wasmBlob)]),
					b.arrowFunctionExpression(
						[b.identifier('c')],
						b.callExpression(
							b.memberExpression(
								b.identifier('c'),
								b.identifier('charCodeAt')
							),
							[b.numericLiteral(0)]
						)
					),
				],
			);
		}
	});
}

fs.ensureDirSync('embedded');
fs.writeFileSync('embedded/index.js', recast.prettyPrint(ast, {
	'wrapColumn': 220,
}).code);
fs.copyFileSync('browser/index.d.ts', 'embedded/index.d.ts');
