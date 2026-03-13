const fs = require('fs');
const path = require('path');

const iconDir = 'C:/Users/User/Downloads/A-math-web/a-math-next/public/icons';
const brainDir = 'C:/Users/User/.gemini/antigravity/brain/8a22e219-e0de-418a-a54d-a0ad6453723c';

console.log('--- ICON SYNC START ---');

if (!fs.existsSync(iconDir)) {
    fs.mkdirSync(iconDir, { recursive: true });
}

// Identify brain icons
const brainIcons = fs.readdirSync(brainDir).filter(f => f.startsWith('amath_icon_'));
console.log('Brain icons found:', brainIcons);

// Clean project icons
fs.readdirSync(iconDir).forEach(f => {
    fs.unlinkSync(path.join(iconDir, f));
    console.log('Removed from project:', f);
});

// Copy and rename
const source192 = brainIcons.find(f => f.includes('_192_'));
const source512 = brainIcons.find(f => f.includes('_512_'));

if (source192) {
    fs.copyFileSync(path.join(brainDir, source192), path.join(iconDir, 'icon-192x192.png'));
    console.log('Copied 192 icon');
}
if (source512) {
    fs.copyFileSync(path.join(brainDir, source512), path.join(iconDir, 'icon-512x512.png'));
    console.log('Copied 512 icon');
}

console.log('Project icons:', fs.readdirSync(iconDir));
console.log('--- ICON SYNC END ---');
