import fs from 'fs';
import path from 'path';

const iconDir = "C:\\Users\\User\\Downloads\\A-math-web\\a-math-next\\public\\icons";

if (fs.existsSync(iconDir)) {
  const files = fs.readdirSync(iconDir);
  console.log("Current files:", files);
  files.forEach(file => {
    if (file.endsWith('.png.png')) {
      const oldPath = path.join(iconDir, file);
      const newPath = path.join(iconDir, file.replace('.png.png', '.png'));
      if (fs.existsSync(newPath)) {
        fs.unlinkSync(newPath);
      }
      fs.renameSync(oldPath, newPath);
      console.log(`Renamed ${file} -> ${path.basename(newPath)}`);
    }
  });
}
