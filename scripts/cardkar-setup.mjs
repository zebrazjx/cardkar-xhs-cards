#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const RELATIVE_SECRET = path.join('.cardkar', 'secret.txt');
const API_KEY_PATTERN = /^ck_(?:test|live)_[A-Za-z0-9_-]{24,128}$/;

function parseArgs(argv) {
  const options = { init: false, check: false, cwd: process.cwd() };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--init') options.init = true;
    else if (arg === '--check') options.check = true;
    else if (arg === '--cwd') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) throw new Error('--cwd requires a path.');
      options.cwd = path.resolve(value);
      index += 1;
    } else if (arg === '--help') {
      process.stdout.write('Usage: cardkar-setup.mjs --init|--check [--cwd PATH]\n');
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (options.init === options.check) throw new Error('Choose exactly one of --init or --check.');
  return options;
}

function parseSecret(value) {
  const line = String(value || '').split(/\r?\n/)
    .map(item => item.trim())
    .find(item => item && !item.startsWith('#')) || '';
  return line.startsWith('CARDKAR_API_KEY=') ? line.slice('CARDKAR_API_KEY='.length).trim() : line;
}

async function ensureGitignore(cwd) {
  const gitignorePath = path.join(cwd, '.gitignore');
  const entry = '.cardkar/secret.txt';
  let current = '';
  try {
    current = await fs.readFile(gitignorePath, 'utf8');
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  if (current.split(/\r?\n/).some(line => line.trim() === entry)) return false;
  const prefix = current && !current.endsWith('\n') ? '\n' : '';
  await fs.appendFile(gitignorePath, `${prefix}${entry}\n`, { encoding: 'utf8', mode: 0o644 });
  return true;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const directory = path.join(options.cwd, '.cardkar');
  const secretPath = path.join(options.cwd, RELATIVE_SECRET);

  if (options.init) {
    await fs.mkdir(directory, { recursive: true, mode: 0o700 });
    let created = false;
    try {
      const handle = await fs.open(secretPath, 'wx', 0o600);
      await handle.writeFile('CARDKAR_API_KEY=\n', 'utf8');
      await handle.close();
      created = true;
    } catch (error) {
      if (error?.code !== 'EEXIST') throw error;
    }
    if (process.platform !== 'win32') {
      await fs.chmod(directory, 0o700);
      await fs.chmod(secretPath, 0o600);
    }
    const gitignoreUpdated = await ensureGitignore(options.cwd);
    process.stdout.write(`${JSON.stringify({
      ok: true,
      created,
      secretPath,
      gitignoreUpdated,
      instruction: 'Paste the complete CardKar API key after CARDKAR_API_KEY=, save the file, then run --check.',
    }, null, 2)}\n`);
    return;
  }

  let value = '';
  let mode = null;
  try {
    const stat = await fs.stat(secretPath);
    mode = stat.mode & 0o777;
    value = parseSecret(await fs.readFile(secretPath, 'utf8'));
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  const permissionsSafe = process.platform === 'win32' || mode === null || (mode & 0o077) === 0;
  process.stdout.write(`${JSON.stringify({
    ok: true,
    secretPath,
    exists: mode !== null,
    permissionsSafe,
    apiKeyConfigured: permissionsSafe && API_KEY_PATTERN.test(value),
  }, null, 2)}\n`);
}

main().catch(error => {
  process.stderr.write(`CardKar setup error: ${error.message}\n`);
  process.exitCode = 1;
});
