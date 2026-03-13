const fs = require('fs');
const path = require('path');

const iconDir = 'C:/Users/User/Downloads/A-math-web/a-math-next/public/icons';
const source192 = 'C:/Users/User/.gemini/antigravity/brain/8a22e219-e0de-418a-a54d-a0ad6453723c/amath_icon_192_1773374045699.png';
const source512 = 'C:/Users/User/.gemini/antigravity/brain/8a22e219-e0de-418a-a54d-a0ad6453723c/amath_icon_512_1773374030460.png';

console.log('--- ICON FIX START ---');

if (fs.existsSync(iconDir)) {
    console.log('Cleaning directory:', iconDir);
    const files = fs.readdirSync(iconDir);
    files.forEach(file => {
        const fullPath = path.join(iconDir, file);
        fs.unlinkSync(fullPath);
        console.log('Deleted:', file);
    });
} else {
    console.log('Creating directory:', iconDir);
    fs.mkdirSync(iconDir, { recursive: true });
}

console.log('Copying 192 icon...');
fs.copyFileSync(source192, path.join(iconDir, 'icon-192x192.png'));
console.log('Copying 512 icon...');
fs.copyFileSync(source512, path.join(iconDir, 'icon-512x512.png'));

console.log('Final verification:');
console.log(fs.readdirSync(iconDir));
console.log('--- ICON FIX END ---');
