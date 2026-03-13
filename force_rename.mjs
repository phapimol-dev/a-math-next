import fs from 'fs';
import path from 'path';

const iconDir = "C:\\Users\\User\\Downloads\\A-math-web\\a-math-next\\public\\icons";

try {
    const files = fs.readdirSync(iconDir);
    files.forEach(file => {
        if (file.endsWith('.png.png')) {
            const oldPath = path.join(iconDir, file);
            const newPath = path.join(iconDir, file.substring(0, file.length - 4));
            fs.renameSync(oldPath, newPath);
            console.log(`Success: Renamed ${file} to ${path.basename(newPath)}`);
        }
    });
} catch (e) {
    console.error("Error:", e);
}
