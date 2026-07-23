#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const CURRENT_VERSION = '1.0.0';
const DEFAULT_MANIFEST_URL = 'https://cardkar.com/downloads/cardkar-xhs-cards.json';
const MAX_PACKAGE_BYTES = 4 * 1024 * 1024;
const SKILL_NAME = 'cardkar-xhs-cards';

function versionParts(value) {
  if (typeof value !== 'string' || !/^\d+\.\d+\.\d+$/.test(value)) {
    throw new Error(`Invalid CardKar Skill version: ${value}`);
  }
  return value.split('.').map(Number);
}

function compareVersions(left, right) {
  const a = versionParts(left);
  const b = versionParts(right);
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index] > b[index] ? 1 : -1;
  }
  return 0;
}

function allowedRemote(url) {
  if (url.protocol === 'https:' && (url.hostname === 'cardkar.com' || url.hostname.endsWith('.cardkar.com'))) return true;
  return process.env.CARDKAR_UPDATE_ALLOW_INSECURE_LOCAL === '1'
    && url.protocol === 'http:'
    && ['127.0.0.1', 'localhost', '::1'].includes(url.hostname);
}

async function fetchBytes(url, maximumBytes) {
  const response = await fetch(url, {
    headers: { Accept: 'application/json, application/zip;q=0.9' },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`Update request failed with HTTP ${response.status}.`);
  const body = Buffer.from(await response.arrayBuffer());
  if (!body.length || body.length > maximumBytes) throw new Error('Update response size is invalid.');
  return body;
}

function safeArchiveEntries(value) {
  const entries = String(value || '').split(/\r?\n/).filter(Boolean);
  if (!entries.length) return false;
  return entries.every(entry => (
    entry.startsWith(`${SKILL_NAME}/`)
    && !entry.startsWith('/')
    && !entry.includes('\\')
    && !entry.split('/').includes('..')
  ));
}

async function installPackage(packageBytes, expectedHash) {
  const actualHash = crypto.createHash('sha256').update(packageBytes).digest('hex');
  if (actualHash !== expectedHash) throw new Error('Downloaded Skill package failed SHA-256 verification.');

  const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'cardkar-skill-update-'));
  const archivePath = path.join(temporaryRoot, 'cardkar.skill');
  const extractRoot = path.join(temporaryRoot, 'extract');
  const currentSkillDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const parentDir = path.dirname(currentSkillDir);
  const stagingDir = path.join(parentDir, `${SKILL_NAME}.update-${process.pid}`);
  const backupDir = path.join(parentDir, `${SKILL_NAME}.backup-${process.pid}`);
  let movedCurrent = false;

  try {
    await fs.writeFile(archivePath, packageBytes, { mode: 0o600 });
    const listing = await execFileAsync('unzip', ['-Z1', archivePath], { maxBuffer: 1024 * 1024 });
    if (!safeArchiveEntries(listing.stdout)) throw new Error('Skill archive contains an unsafe path.');
    await fs.mkdir(extractRoot, { recursive: true, mode: 0o700 });
    await execFileAsync('unzip', ['-q', archivePath, '-d', extractRoot], { maxBuffer: 1024 * 1024 });
    const extractedSkill = path.join(extractRoot, SKILL_NAME);
    const [skillMarkdown, clientStat, updaterStat] = await Promise.all([
      fs.readFile(path.join(extractedSkill, 'SKILL.md'), 'utf8'),
      fs.stat(path.join(extractedSkill, 'scripts', 'cardkar-client.mjs')),
      fs.stat(path.join(extractedSkill, 'scripts', 'cardkar-update.mjs')),
    ]);
    if (!/^---\n[\s\S]*?name:\s*cardkar-xhs-cards\s*$/m.test(skillMarkdown) || !clientStat.isFile() || !updaterStat.isFile()) {
      throw new Error('Downloaded Skill package is incomplete.');
    }

    await fs.rm(stagingDir, { recursive: true, force: true });
    await fs.cp(extractedSkill, stagingDir, { recursive: true, force: false });
    await fs.rename(currentSkillDir, backupDir);
    movedCurrent = true;
    await fs.rename(stagingDir, currentSkillDir);
    await fs.rm(backupDir, { recursive: true, force: true });
    movedCurrent = false;
  } catch (error) {
    if (movedCurrent) {
      await fs.rm(currentSkillDir, { recursive: true, force: true }).catch(() => {});
      await fs.rename(backupDir, currentSkillDir).catch(() => {});
    }
    throw error;
  } finally {
    await fs.rm(stagingDir, { recursive: true, force: true }).catch(() => {});
    await fs.rm(temporaryRoot, { recursive: true, force: true }).catch(() => {});
  }
}

async function main() {
  const checkOnly = process.argv.includes('--check-only');
  if (process.env.CARDKAR_AUTO_UPDATE === '0') {
    process.stdout.write(`${JSON.stringify({ ok: true, disabled: true, currentVersion: CURRENT_VERSION })}\n`);
    return;
  }
  const manifestUrl = new URL(process.env.CARDKAR_UPDATE_MANIFEST_URL || DEFAULT_MANIFEST_URL);
  if (!allowedRemote(manifestUrl)) throw new Error('CardKar update manifest must use an approved HTTPS origin.');

  let manifestBytes;
  try {
    manifestBytes = await fetchBytes(manifestUrl, 64 * 1024);
  } catch (error) {
    process.stdout.write(`${JSON.stringify({
      ok: false,
      continueWithCurrentVersion: true,
      currentVersion: CURRENT_VERSION,
      message: error.message,
    })}\n`);
    return;
  }
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  const packageUrl = new URL(manifest.packageUrl, manifestUrl);
  if (
    manifest.skill !== SKILL_NAME
    || typeof manifest.sha256 !== 'string'
    || !/^[a-f0-9]{64}$/.test(manifest.sha256)
    || !allowedRemote(packageUrl)
  ) {
    throw new Error('CardKar update manifest is invalid.');
  }
  const comparison = compareVersions(manifest.version, CURRENT_VERSION);
  if (comparison <= 0) {
    process.stdout.write(`${JSON.stringify({
      ok: true,
      currentVersion: CURRENT_VERSION,
      latestVersion: manifest.version,
      updateAvailable: false,
    })}\n`);
    return;
  }
  if (checkOnly) {
    process.stdout.write(`${JSON.stringify({
      ok: true,
      currentVersion: CURRENT_VERSION,
      latestVersion: manifest.version,
      updateAvailable: true,
    })}\n`);
    return;
  }
  const packageBytes = await fetchBytes(packageUrl, MAX_PACKAGE_BYTES);
  await installPackage(packageBytes, manifest.sha256);
  process.stdout.write(`${JSON.stringify({
    ok: true,
    previousVersion: CURRENT_VERSION,
    currentVersion: manifest.version,
    updated: true,
    restartRequired: true,
  })}\n`);
}

main().catch(error => {
  process.stderr.write(`CardKar update error: ${error.message}\n`);
  process.exitCode = 1;
});
