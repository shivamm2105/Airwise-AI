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

const SECRET_FILE_EXTENSIONS = ['.key', '.pem', '.p12', '.pfx'];

const SECRET_CONTENT_PATTERNS = [
  { name: 'Google API Key', regex: /AIza[0-9A-Za-z_-]{30,}/g },
  { name: 'Google GenAI Token', regex: /AQ\.[0-9A-Za-z_-]{20,}/g },
  { name: 'Private Key Block', regex: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g },
  { name: 'AWS Access Key ID', regex: /\bAKIA[0-9A-Z]{16}\b/g },
  { name: 'GitHub Token', regex: /\bgh[pousr]_[0-9A-Za-z]{30,}\b/g },
  { name: 'OpenAI/Secret Bearer Key', regex: /\bsk-[0-9A-Za-z]{20,}\b/g },
  { name: 'Populated GEMINI_API_KEY', regex: /^[ \t]*GEMINI_API_KEY[ \t]*=[ \t]*(?!$|[ \t]*#|["'][ \t]*["'][ \t]*$|<|your_|example)[^ \t\r\n#]{10,}/gm }
];

function getFilesRecursively(dir) {
  let results = [];
  const list = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of list) {
    if (IGNORED_DIRS.has(item.name)) continue;
    if (item.name === '.env') continue;

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
console.log('📦 AIRWISE AI — REPOSITORY SIZE & SECURITY AUDIT');
console.log('=======================================================');
console.log(`Total Source Files: ${files.length}`);
console.log(`Total Source Size: ${totalMB} MB (${totalBytes.toLocaleString()} bytes)`);
console.log(`Competition Limit: 10.00 MB (Safety Margin: ${maxThresholdMB} MB)`);

if (totalBytes < maxThresholdMB * 1024 * 1024) {
  console.log(`✅ COMPLIANT: Repository size is ${totalMB} MB, well below the 8 MB margin!`);
} else {
  console.log(`❌ WARNING: Repository size exceeds ${maxThresholdMB} MB!`);
  process.exitCode = 1;
}

console.log('\nTop 10 Largest Source Files:');
fileStats.slice(0, 10).forEach((f, idx) => {
  console.log(`  ${idx + 1}. ${f.file} (${f.sizeKB} KB)`);
});

console.log('\n🔒 Secret File & Content Pattern Scan across Git-Tracked Files:');
try {
  const gitTracked = execSync('git ls-files', { encoding: 'utf-8' })
    .split(/\r?\n/)
    .map(f => f.trim())
    .filter(Boolean);

  const secretFileViolations = gitTracked.filter(
    f => f === '.env' || f.startsWith('.env.') && f !== '.env.example' || SECRET_FILE_EXTENSIONS.some(ext => f.endsWith(ext))
  );

  const contentViolations = [];
  const filesToScan = new Set([
    ...gitTracked.map(rel => path.resolve(rootDir, rel)),
    ...files
  ]);

  for (const absPath of filesToScan) {
    const relPath = path.relative(rootDir, absPath).replace(/\\/g, '/');
    if (relPath === 'package-lock.json' || relPath === 'scripts/size-audit.js') continue;
    if (!fs.existsSync(absPath)) continue;

    try {
      const content = fs.readFileSync(absPath, 'utf-8');
      for (const pattern of SECRET_CONTENT_PATTERNS) {
        pattern.regex.lastIndex = 0;
        if (pattern.regex.test(content)) {
          contentViolations.push({ file: relPath, pattern: pattern.name });
        }
      }
    } catch {
      // Skip non-readable binary files
    }
  }

  if (secretFileViolations.length === 0 && contentViolations.length === 0) {
    console.log(`  ✅ Clean: Scanned ${filesToScan.size} workspace & git-tracked files — zero credential files or secret patterns found.`);
  } else {
    if (secretFileViolations.length > 0) {
      console.log('  ❌ VIOLATION: Sensitive credential files tracked in git:');
      secretFileViolations.forEach(v => console.log(`     - ${v}`));
    }
    if (contentViolations.length > 0) {
      console.log('  ❌ VIOLATION: Secret patterns matched inside tracked files:');
      contentViolations.forEach(v => console.log(`     - ${v.file} (${v.pattern})`));
    }
    process.exitCode = 1;
  }
} catch {
  console.log('  ⚠️ Git file scan skipped (not inside a git repository).');
}
console.log('=======================================================');
