import fs from 'fs';
import path from 'path';

const iconDir = "C:\\Users\\User\\Downloads\\A-math-web\\a-math-next\\public\\icons";

if (fs.existsSync(iconDir)) {
    const files = fs.readdirSync(iconDir);
    console.log("Files in icons dir:", files);
    files.forEach(file => {
        if (file.endsWith('.png.png')) {
            const oldPath = path.join(iconDir, file);
            const newPath = path.join(iconDir, file.replace('.png.png', '.png'));
            console.log(`Renaming ${file} to ${path.basename(newPath)}`);
            fs.renameSync(oldPath, newPath);
        }
    });
} else {
    console.log("Icon directory not found!");
}
