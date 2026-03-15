import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ROOT = path.resolve(__dirname, '..');
const WATCH_DIRS = ['src', 'themes', 'content'];
const WATCH_FILES = ['style.css', 'index.html'];

let timeout: ReturnType<typeof setTimeout> | null = null;

function build(): void {
  try {
    console.log('Rebuilding...');
    execSync('./build.sh', { cwd: ROOT, stdio: 'inherit' });
  } catch {
    console.error('Build failed');
  }
}

function onChange(): void {
  // Debounce: wait 200ms after last change before rebuilding
  if (timeout) clearTimeout(timeout);
  timeout = setTimeout(build, 200);
}

// Watch directories recursively
for (const dir of WATCH_DIRS) {
  const fullPath = path.join(ROOT, dir);
  if (fs.existsSync(fullPath)) {
    fs.watch(fullPath, { recursive: true }, onChange);
  }
}

// Watch individual files
for (const file of WATCH_FILES) {
  const fullPath = path.join(ROOT, file);
  if (fs.existsSync(fullPath)) {
    fs.watch(fullPath, onChange);
  }
}

console.log('Watching for changes...');
