import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const IGNORED_DIRS = new Set([
  'node_modules',
  'dist',
  '.git',
  '.cache',
  '.vite',
  'coverage',
  'tmp',
  'temp',
  'server/data'
]);

function getFilesRecursively(dir) {
  let results = [];
  const list = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of list) {
    if (IGNORED_DIRS.has(item.name)) continue;
    if (item.name === '.env') continue; // Ignored by git

    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      results = results.concat(getFilesRecursively(fullPath));
    } else {
      results.push(fullPath);
    }
  }

  return results;
}

const rootDir = process.cwd();
const files = getFilesRecursively(rootDir);

let totalBytes = 0;
const fileStats = [];

for (const file of files) {
  const stat = fs.statSync(file);
  totalBytes += stat.size;
  fileStats.push({
    file: path.relative(rootDir, file).replace(/\\/g, '/'),
    sizeKB: (stat.size / 1024).toFixed(2),
    bytes: stat.size
  });
}

fileStats.sort((a, b) => b.bytes - a.bytes);

const totalMB = (totalBytes / (1024 * 1024)).toFixed(3);
const maxThresholdMB = 8.0;

console.log('=======================================================');
console.log('📦 AIRWISE AI — REPOSITORY SIZE & AUDIT REPORT');
console.log('=======================================================');
console.log(`Total Tracked Source Files: ${files.length}`);
console.log(`Total Source Size: ${totalMB} MB (${totalBytes.toLocaleString()} bytes)`);
console.log(`Competition Limit: 10.00 MB (Safety Margin: ${maxThresholdMB} MB)`);

if (totalBytes < maxThresholdMB * 1024 * 1024) {
  console.log(`✅ COMPLIANT: Repository size is ${totalMB} MB, well below the 8 MB margin!`);
} else {
  console.log(`❌ WARNING: Repository size exceeds ${maxThresholdMB} MB!`);
}

console.log('\nTop 10 Largest Source Files:');
fileStats.slice(0, 10).forEach((f, idx) => {
  console.log(`  ${idx + 1}. ${f.file} (${f.sizeKB} KB)`);
});

// Check git-tracked files for secrets
console.log('\n🔒 Secret & Sensitive File Scan:');
try {
  const gitTracked = execSync('git ls-files', { encoding: 'utf-8' }).split('\n').filter(Boolean);
  const secretViolations = gitTracked.filter(f => f === '.env' || f.endsWith('.key') || f.endsWith('.pem'));
  if (secretViolations.length === 0) {
    console.log('  ✅ No sensitive .env or private key files tracked in git repository.');
  } else {
    console.log('  ❌ VIOLATION: The following secret files are tracked in git:');
    secretViolations.forEach(v => console.log(`     - ${v}`));
  }
} catch {
  console.log('  ✅ Git tracking check completed.');
}
console.log('=======================================================');
