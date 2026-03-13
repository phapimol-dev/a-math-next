const fs = require('fs');
const path = require('path');

const iconDir = 'C:\\Users\\User\\Downloads\\A-math-web\\a-math-next\\public\\icons';
const source192 = 'C:\\Users\\User\\.gemini\\antigravity\brain\\8a22e219-e0de-418a-a54d-a0ad6453723c\\amath_icon_192_1773374045699.png';
const source512 = 'C:\\Users\\User\\.gemini\\antigravity\brain\\8a22e219-e0de-418a-a54d-a0ad6453723c\\amath_icon_512_1773374030460.png';

if (!fs.existsSync(iconDir)) {
    fs.mkdirSync(iconDir, { recursive: true });
}

// Clean dir
fs.readdirSync(iconDir).forEach(file => {
    fs.unlinkSync(path.join(iconDir, file));
});

// Copy
fs.copyFileSync(source192, path.join(iconDir, 'icon-192x192.png'));
fs.copyFileSync(source512, path.join(iconDir, 'icon-512x512.png'));

console.log('Icons standardized successfully.');
