import fs from 'node:fs';
import path from 'node:path';

const ROOTS = ['apps/web', 'packages', 'apps/api'];
const FILE_GLOBS = [/.*mock.*/i, /.*fixture.*/i, /.*stub.*/i];
const STR_PATTERNS = [
  /(^|\b)mock(ed|s)?(\b|$)/i,
  /(^|\b)fixture(s)?(\b|$)/i,
  /(^|\b)stub(s|bed)?(\b|$)/i,
  /\bFAKE_\w+\b/i,
  /\bMOCK_\w+\b/i,
  /\bmockQuotes\b/i,
  /\bmockStats?\b/i,
  /\bfake(Data|Response|Client)\b/i,
  /hardcoded\s*(json|data)/i,
  /(toCSV|downloadCsv|buildCsv)\s*\(/i,
];
const ADMIN_HINTS = [
  /apps\/web\/app\/(?:\(admin\)|admin)\//,
  /apps\/web\/src\/features\/admin\//,
];
const IGNORE_EXTS = new Set([
  '.log',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.svg',
  '.ico',
  '.webp',
  '.zip',
  '.gz',
  '.tar',
  '.lock',
  '.map',
  '.pdf',
]);
const IGNORE_DIRS = new Set([
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  'coverage',
  'audit',
  'database',
  'scripts',
  'docs',
  'venv',
  '__pycache__',
]);

const allowlistPath = path.join('tools', 'mock_scan', 'allowlist.json');
let allowlist = { ignorePaths: [], ignoreRegexes: [] };
if (fs.existsSync(allowlistPath)) {
  allowlist = JSON.parse(fs.readFileSync(allowlistPath, 'utf8'));
}
const allowRegexes = allowlist.ignoreRegexes.map((pattern) => new RegExp(pattern, 'i'));

const outDir = 'audit';
fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(path.join(outDir, 'search-logs'), { recursive: true });

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (allowlist.ignorePaths.includes(full)) continue;
    if (allowRegexes.some((rx) => rx.test(full))) continue;
    if (entry.isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

function matchFileByName(p) {
  return FILE_GLOBS.some((rx) => rx.test(path.basename(p)));
}

function scanFile(p) {
  const { size } = fs.statSync(p);
  if (size > 1024 * 1024) {
    return [];
  }
  let src;
  try {
    src = fs.readFileSync(p, 'utf8');
  } catch {
    return [];
  }
  const hits = [];
  const lines = src.split(/\r?\n/);
  for (let idx = 0; idx < lines.length; idx += 1) {
    const line = lines[idx];
    for (const rx of STR_PATTERNS) {
      if (rx.test(line)) {
        hits.push({ line: idx + 1, match: line.trim().slice(0, 400) });
      }
    }
  }
  return hits;
}

const files = [];
for (const root of ROOTS) {
  if (fs.existsSync(root)) walk(root, files);
}

const results = [];
for (const file of files) {
  if (IGNORE_EXTS.has(path.extname(file).toLowerCase())) {
    continue;
  }
  const byName = matchFileByName(file);
  const hits = scanFile(file);
  if (!byName && !hits.length) continue;
  const admin = ADMIN_HINTS.some((rx) => rx.test(file));
  results.push({ file, byName, hits, isAdminSurface: admin });
}

results.sort((a, b) => a.file.localeCompare(b.file));

const totalRefs = results.reduce((acc, r) => acc + r.hits.length, 0);
const summary = {
  generatedAt: new Date().toISOString(),
  totals: {
    filesScanned: files.length,
    filesWithRefs: results.length,
    refs: totalRefs,
    adminSurfaceRefs: results.filter((r) => r.isAdminSurface && (r.byName || r.hits.length)).length,
  },
  exportHandlers: results
    .filter((r) => r.hits.some((h) => /(toCSV|downloadCsv|buildCsv)/i.test(h.match)))
    .map((r) => r.file),
};

fs.writeFileSync(path.join(outDir, 'mock-kill-list.json'), JSON.stringify({ summary, results }, null, 2));
fs.writeFileSync(
  path.join(outDir, 'mock-kill-list.txt'),
  results.map((r) => `${r.file}:${r.hits.map((h) => h.line).join(',')}`).join('\n'),
);

const mdLines = [
  '# Mock Kill-List',
  '',
  `Generated: ${summary.generatedAt}`,
  '',
  `* Files scanned: ${summary.totals.filesScanned}`,
  `* Files with refs: ${summary.totals.filesWithRefs}`,
  `* Total refs: ${summary.totals.refs}`,
  `* Admin-surface refs: ${summary.totals.adminSurfaceRefs}`,
  '',
  '## Export Handlers',
  ...summary.exportHandlers.map((file) => `- ${file}`),
  '',
  '## Top Files by Hits',
  ...results
    .map((r) => ({ file: r.file, count: r.hits.length, admin: r.isAdminSurface }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 30)
    .map((entry) => `- ${entry.file} — ${entry.count} ${entry.admin ? '(admin)' : ''}`),
];

fs.writeFileSync(path.join(outDir, 'mock-kill-summary.md'), mdLines.join('\n'));

console.log('Wrote audit/mock-kill-list.{json,txt}, audit/mock-kill-summary.md');
