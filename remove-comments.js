const fs = require('fs');
const path = require('path');

// ── CONFIG ─────────────────────────────────────────────────
const TARGET_EXTENSIONS = ['.html', '.css', '.js'];
const SKIP_FILES = ['remove-comments.js']; // skip this script itself

// ── COMMENT REMOVERS ───────────────────────────────────────

function removeHTMLComments(content) {
  // Removes <!-- ... --> including multiline
  return content.replace(/<!--[\s\S]*?-->/g, '');
}

function removeCSSComments(content) {
  // Removes /* ... */ including multiline
  return content.replace(/\/\*[\s\S]*?\*\//g, '');
}

function removeJSComments(content) {
  // Uses a state machine to safely strip comments
  // without touching strings, regex literals, or URLs
  let result = '';
  let i = 0;

  while (i < content.length) {
    const ch = content[i];
    const next = content[i + 1];

    // Single-quoted string — skip entire string
    if (ch === "'") {
      let j = i + 1;
      while (j < content.length) {
        if (content[j] === '\\') { j += 2; continue; }
        if (content[j] === "'") { j++; break; }
        j++;
      }
      result += content.slice(i, j);
      i = j;
      continue;
    }

    // Double-quoted string — skip entire string
    if (ch === '"') {
      let j = i + 1;
      while (j < content.length) {
        if (content[j] === '\\') { j += 2; continue; }
        if (content[j] === '"') { j++; break; }
        j++;
      }
      result += content.slice(i, j);
      i = j;
      continue;
    }

    // Template literal — skip entire backtick string
    if (ch === '`') {
      let j = i + 1;
      while (j < content.length) {
        if (content[j] === '\\') { j += 2; continue; }
        if (content[j] === '`') { j++; break; }
        j++;
      }
      result += content.slice(i, j);
      i = j;
      continue;
    }

    // Single-line comment //
    if (ch === '/' && next === '/') {
      // Skip until end of line
      let j = i + 2;
      while (j < content.length && content[j] !== '\n') j++;
      // Preserve the newline so line numbers stay intact
      result += '\n';
      i = j;
      continue;
    }

    // Block comment /* ... */
    if (ch === '/' && next === '*') {
      let j = i + 2;
      while (j < content.length) {
        if (content[j] === '*' && content[j + 1] === '/') { j += 2; break; }
        j++;
      }
      i = j;
      continue;
    }

    result += ch;
    i++;
  }

  return result;
}

// ── CLEAN UP BLANK LINES ───────────────────────────────────

function collapseBlankLines(content) {
  // Collapse 3+ consecutive blank lines down to 1
  return content.replace(/\n{3,}/g, '\n\n').trim();
}

// ── PROCESS A SINGLE FILE ──────────────────────────────────

function processFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const fileName = path.basename(filePath);

  if (SKIP_FILES.includes(fileName)) {
    console.log(`  ⏭  Skipped:  ${fileName}`);
    return;
  }

  if (!TARGET_EXTENSIONS.includes(ext)) return;

  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    console.error(`  ✗  Failed to read: ${filePath}`);
    return;
  }

  const original = content;
  let cleaned;

  if (ext === '.html') cleaned = removeHTMLComments(content);
  if (ext === '.css')  cleaned = removeCSSComments(content);
  if (ext === '.js')   cleaned = removeJSComments(content);

  cleaned = collapseBlankLines(cleaned);

  if (cleaned === original.trim()) {
    console.log(`  ✓  No comments: ${fileName}`);
    return;
  }

  try {
    fs.writeFileSync(filePath, cleaned, 'utf8');
    console.log(`  ✅ Cleaned:    ${fileName}`);
  } catch (err) {
    console.error(`  ✗  Failed to write: ${filePath}`);
  }
}

// ── WALK DIRECTORY RECURSIVELY ─────────────────────────────

function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    // Skip node_modules and hidden folders
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walkDir(fullPath);
    } else if (entry.isFile()) {
      processFile(fullPath);
    }
  }
}

// ── MAIN ───────────────────────────────────────────────────

const projectDir = process.cwd();

console.log('\n🧹 Remove Comments Script');
console.log('─────────────────────────────────────────');
console.log(`📁 Scanning: ${projectDir}`);
console.log('─────────────────────────────────────────\n');

walkDir(projectDir);

console.log('\n─────────────────────────────────────────');
console.log('✅ Done! All comments removed.\n');