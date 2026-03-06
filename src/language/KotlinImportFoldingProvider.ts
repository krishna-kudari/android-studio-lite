import * as vscode from 'vscode';

/**
 * Provides import block folding for Kotlin files.
 *
 * Some Kotlin language servers don't tag import folding ranges with
 * FoldingRangeKind.Imports, so editor.foldingImportsByDefault has no effect.
 * This provider scans for the import block and returns it with the correct kind.
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
			// Imports are typically a contiguous block near the top; once we hit
			// a non-import, non-blank, non-comment line after the block starts, we're done.
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
