import * as vscode from 'vscode';

/**
 * Provides import block folding for Kotlin files.
 *
 * fwcd/kotlin-language-server never returns FoldingRangeKind.Imports,
 * so editor.foldingImportsByDefault has no effect on .kt files.
 * We register our own provider that scans for the import block and
 * returns it with the correct kind — VS Code then auto-folds it.
 */
export class KotlinImportFoldingProvider implements vscode.FoldingRangeProvider {
	provideFoldingRanges(document: vscode.TextDocument): vscode.FoldingRange[] {
		let firstImport = -1;
		let lastImport = -1;

		for (let i = 0; i < document.lineCount; i++) {
			const line = document.lineAt(i).text.trimStart();

			if (line.startsWith('import ')) {
				if (firstImport === -1) firstImport = i;
				lastImport = i;
				continue;
			}

			// Stop scanning once we've passed the import block.
			// Imports are always a contiguous block near the top —
			// once we hit a non-import, non-blank, non-comment line
			// after the block has started, we're done.
			if (
				firstImport !== -1 &&
				line !== '' &&
				!line.startsWith('//') &&
				!line.startsWith('/*')
			) {
				break;
			}
		}

		// Need at least 2 import lines to be worth folding
		if (firstImport === -1 || lastImport <= firstImport) {
			return [];
		}

		return [
			new vscode.FoldingRange(
				firstImport,
				lastImport,
				vscode.FoldingRangeKind.Imports,
			),
		];
	}
}
