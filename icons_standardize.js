const fs = require('fs');
const path = require('path');

const iconDir = 'C:\\Users\\User\\Downloads\\A-math-web\\a-math-next\\public\\icons';
const source192 = 'C:\\Users\\User\\.gemini\\antigravity\\brain\\8a22e219-e0de-418a-a54d-a0ad6453723c\\amath_icon_192_1773374045699.png';
const source512 = 'C:\\Users\\User\\.gemini\\antigravity\\brain\\8a22e219-e0de-418a-a54d-a0ad6453723c\\amath_icon_512_1773374030460.png';

console.log('Target dir:', iconDir);

if (!fs.existsSync(iconDir)) {
    fs.mkdirSync(iconDir, { recursive: true });
}

// Clean dir
fs.readdirSync(iconDir).forEach(file => {
    const p = path.join(iconDir, file);
    fs.unlinkSync(p);
    console.log('Deleted:', p);
});

// Copy
fs.copyFileSync(source192, path.join(iconDir, 'icon-192x192.png'));
fs.copyFileSync(source512, path.join(iconDir, 'icon-512x512.png'));

const finalFiles = fs.readdirSync(iconDir);
console.log('Final files in dir:', finalFiles);
if (finalFiles.length === 2) {
    console.log('SUCCESS: Icons standardized.');
} else {
    console.log('ERROR: Expected 2 files, found', finalFiles.length);
}
