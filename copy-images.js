#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const sourceDir = 'c:\\Users\\Mohan\\OneDrive\\Desktop\\images';
const destDir = path.join(__dirname, 'client', 'public', 'images');

// Create destination directory if it doesn't exist
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
  console.log(`Created directory: ${destDir}`);
}

// Copy all PNG files
try {
  const files = fs.readdirSync(sourceDir);
  const pngFiles = files.filter(f => f.toLowerCase().endsWith('.png'));
  
  if (pngFiles.length === 0) {
    console.log('No PNG files found in source directory');
    process.exit(0);
  }
  
  pngFiles.forEach(file => {
    const sourcePath = path.join(sourceDir, file);
    const destPath = path.join(destDir, file);
    fs.copyFileSync(sourcePath, destPath);
    console.log(`Copied: ${file}`);
  });
  
  console.log(`\nSuccessfully copied ${pngFiles.length} PNG file(s)`);
} catch (error) {
  console.error('Error copying files:', error.message);
  process.exit(1);
}
