import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const scanRoots = ['components', 'lib'];
const blockedPatterns = [
  { regex: /from ['"]\.\.\/\.\.\/lib\/demoHqUsers['"]/g, message: 'Runtime import of demo HQ auth helpers.' },
  { regex: /from ['"]\.\.\/\.\.\/constants['"][\s\S]*MOCK_INVOICES/g, message: 'Runtime usage of MOCK_INVOICES constants.' },
  { regex: /\bloginAs\s*\(/g, message: 'Runtime use of session-only loginAs API.' },
];

async function collectTsFiles(targetDir, acc) {
  const entries = await readdir(targetDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'tests') continue;
    const fullPath = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      await collectTsFiles(fullPath, acc);
      continue;
    }
    if (!entry.isFile()) continue;
    if (!/\.(ts|tsx)$/.test(entry.name)) continue;
    if (/\.test\.(ts|tsx)$/.test(entry.name) || /\.spec\.(ts|tsx)$/.test(entry.name)) continue;
    acc.push(fullPath);
  }
}

async function listFiles() {
  const files = [];
  for (const root of scanRoots) {
    await collectTsFiles(path.join(rootDir, root), files);
  }
  files.push(path.join(rootDir, 'App.tsx'));
  return files;
}

function lineNumberFor(source, index) {
  return source.slice(0, index).split('\n').length;
}

async function main() {
  const files = await listFiles();
  const violations = [];

  for (const file of files) {
    const source = await readFile(file, 'utf8');
    for (const rule of blockedPatterns) {
      rule.regex.lastIndex = 0;
      const match = rule.regex.exec(source);
      if (!match || match.index == null) continue;
      violations.push({
        file: path.relative(rootDir, file),
        line: lineNumberFor(source, match.index),
        message: rule.message,
      });
    }
  }

  if (violations.length > 0) {
    console.error('Launch gate failed: blocked mock/demo runtime patterns found.\n');
    for (const violation of violations) {
      console.error(`- ${violation.file}:${violation.line} ${violation.message}`);
    }
    process.exit(1);
  }

  console.log('Launch gate passed: no blocked mock/demo runtime patterns found.');
}

await main();
