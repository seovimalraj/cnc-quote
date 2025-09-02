const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

function findTsFiles(dir) {
  const files = [];
  function walk(currentPath) {
    const items = fs.readdirSync(currentPath);
    for (const item of items) {
      const fullPath = path.join(currentPath, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory() && !item.includes('node_modules') && !item.includes('dist')) {
        walk(fullPath);
      } else if (item.endsWith('.ts') && !item.endsWith('.spec.ts') && !item.endsWith('.test.ts')) {
        files.push(fullPath);
      }
    }
  }
  walk(dir);
  return files;
}

async function checkFile(file) {
  return new Promise((resolve) => {
    const proc = spawn('./node_modules/.bin/tsc', ['--noEmit', '--skipLibCheck', file], {
      cwd: process.cwd(),
      timeout: 5000
    });
    
    let output = '';
    proc.stdout.on('data', (data) => output += data.toString());
    proc.stderr.on('data', (data) => output += data.toString());
    
    proc.on('close', (code) => {
      resolve({ file, code, output });
    });
    
    proc.on('error', () => {
      resolve({ file, code: 1, output: 'Error running tsc' });
    });
  });
}

async function main() {
  const files = findTsFiles('./src').slice(0, 10); // Check first 10 files
  console.log(`Checking ${files.length} files...`);
  
  for (const file of files) {
    const result = await checkFile(file);
    if (result.code !== 0) {
      console.log(`\n=== ERRORS in ${result.file} ===`);
      console.log(result.output);
    } else {
      console.log(`✓ ${result.file}`);
    }
  }
}

main().catch(console.error);
