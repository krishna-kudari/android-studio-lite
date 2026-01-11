const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src', 'scripts');
const outDir = path.join(__dirname, '..', 'out', 'scripts');

// Create out/scripts directory if it doesn't exist
if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}

// Copy all .kts files from src/scripts to out/scripts
if (fs.existsSync(srcDir)) {
    const files = fs.readdirSync(srcDir);
    files.forEach(file => {
        if (file.endsWith('.kts')) {
            const srcFile = path.join(srcDir, file);
            const outFile = path.join(outDir, file);
            fs.copyFileSync(srcFile, outFile);
            console.log(`Copied ${file} to out/scripts/`);
        }
    });
} else {
    console.warn('src/scripts directory not found');
}
