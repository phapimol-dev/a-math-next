const fs = require('fs');
const path = require('path');

const brainDir = 'C:/Users/User/.gemini/antigravity/brain/8a22e219-e0de-418a-a54d-a0ad6453723c';
const iconDir = 'C:/Users/User/Downloads/A-math-web/a-math-next/public/icons';

console.log('--- FINAL ICON FIX ---');

// 1. Find the actual icons in brain dir
const files = fs.readdirSync(brainDir);
const i192 = files.find(f => f.includes('192') && f.endsWith('.png.png') || f.endsWith('.png'));
const i512 = files.find(f => f.includes('512') && f.endsWith('.png.png') || f.endsWith('.png'));

console.log('Source 192:', i192);
console.log('Source 512:', i512);

if (i192 && i512) {
    if (!fs.existsSync(iconDir)) fs.mkdirSync(iconDir, { recursive: true });
    
    // Clean project icons
    fs.readdirSync(iconDir).forEach(f => {
        fs.unlinkSync(path.join(iconDir, f));
    });

    // Copy with EXACT target names
    fs.copyFileSync(path.join(brainDir, i192), path.join(iconDir, 'icon-192x192.png'));
    fs.copyFileSync(path.join(brainDir, i512), path.join(iconDir, 'icon-512x512.png'));
    
    console.log('Successfully copied icons.');
} else {
    console.error('Could not find source icons in brain dir.');
}

console.log('Project Icons:', fs.readdirSync(iconDir));
