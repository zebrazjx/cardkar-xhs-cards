#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const IMAGE_TYPES = Object.freeze({
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
});

function usage() {
  return `Usage: cardkar-client.mjs --md PATH [options]

Options:
  --cover PATH             Optional 16:9 PNG/JPEG/WebP cover (max 4 MiB)
  --avatar PATH            Optional PNG/JPEG/WebP avatar (max 180 KiB)
  --nick TEXT              Creator nickname
  --handle TEXT            Creator handle or subtitle
  --max-cards N            Maximum output cards (default: 12)
  --outdir PATH            Output directory (default: ./cardkar-cards)
  --base-url URL           CardKar origin (default: CARDKAR_API_BASE_URL or https://cardkar.com)
  --idempotency-key VALUE  Reuse an existing request key
  --dry-run                Validate files and print a redacted request summary
  --help                   Show this help

Read CARDKAR_API_KEY from the environment. Never pass the key on the command line.`;
}

function parseArgs(argv) {
  const options = Object.create(null);
  const valueFlags = new Set([
    '--md', '--cover', '--avatar', '--nick', '--handle', '--max-cards', '--outdir', '--base-url', '--idempotency-key',
  ]);
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '--dry-run') {
      options[arg.slice(2)] = true;
      continue;
    }
    if (!valueFlags.has(arg)) throw new Error(`Unknown argument: ${arg}`);
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`${arg} requires a value.`);
    options[arg.slice(2)] = value;
    index += 1;
  }
  return options;
}

function imageType(filePath) {
  const type = IMAGE_TYPES[path.extname(filePath).toLowerCase()];
  if (!type) throw new Error(`${filePath} must be PNG, JPEG, or WebP.`);
  return type;
}

async function imageDataUrl(filePath, maximumBytes, label) {
  const absolute = path.resolve(filePath);
  const body = await fs.readFile(absolute);
  if (!body.length || body.length > maximumBytes) {
    throw new Error(`${label} must be between 1 byte and ${maximumBytes} bytes: ${absolute}`);
  }
  return { dataUrl: `data:${imageType(absolute)};base64,${body.toString('base64')}`, absolute, bytes: body.length };
}

function normalizeBaseUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('CardKar base URL must be an absolute HTTP or HTTPS URL.');
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error('CardKar base URL must not contain credentials, query, or fragment.');
  }
  return url.toString().replace(/\/$/, '');
}

function stableIdempotencyKey(payload) {
  return `skill_${crypto.createHash('sha256').update(JSON.stringify(payload), 'utf8').digest('base64url').slice(0, 48)}`;
}

function safeFilename(value, index) {
  return typeof value === 'string' && /^card-[0-9]+\.png$/.test(value)
    ? value
    : `card-${String(index + 1).padStart(2, '0')}.png`;
}

async function errorMessage(response) {
  try {
    const payload = await response.json();
    const code = payload?.error?.code || `HTTP_${response.status}`;
    const message = payload?.error?.message || response.statusText;
    return `${code}: ${message}`;
  } catch {
    return `HTTP_${response.status}: ${response.statusText}`;
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }
  if (!options.md) throw new Error('--md is required.');

  const markdownPath = path.resolve(options.md);
  const markdown = (await fs.readFile(markdownPath, 'utf8')).replace(/\r\n?/g, '\n').trim();
  if (!markdown) throw new Error('Markdown file is empty.');

  const maxCards = Number(options['max-cards'] || 12);
  if (!Number.isSafeInteger(maxCards) || maxCards < 1 || maxCards > 16) {
    throw new Error('--max-cards must be an integer from 1 to 16.');
  }

  const cover = options.cover ? await imageDataUrl(options.cover, 4 * 1024 * 1024, 'Cover') : null;
  const avatarPath = options.avatar || process.env.CARDKAR_AVATAR || '';
  const avatar = avatarPath ? await imageDataUrl(avatarPath, 180 * 1024, 'Avatar') : null;
  const payload = {
    version: '1',
    markdown,
    nickname: options.nick || process.env.CARDKAR_NICKNAME || '我是卡卡',
    handle: options.handle || process.env.CARDKAR_HANDLE || '@cardkar',
    ...(avatar ? { avatarData: avatar.dataUrl } : {}),
    ...(cover ? { coverData: cover.dataUrl } : {}),
    maxCards,
  };
  const idempotencyKey = options['idempotency-key'] || stableIdempotencyKey(payload);
  if (!/^[A-Za-z0-9_-]{16,96}$/.test(idempotencyKey)) {
    throw new Error('--idempotency-key must contain 16 to 96 URL-safe characters.');
  }
  const baseUrl = normalizeBaseUrl(options['base-url'] || process.env.CARDKAR_API_BASE_URL || 'https://cardkar.com');
  const outdir = path.resolve(options.outdir || './cardkar-cards');

  if (options['dry-run']) {
    process.stdout.write(`${JSON.stringify({
      ok: true,
      dryRun: true,
      endpoint: `${baseUrl}/api/v1/skills/xhs-highlight/render`,
      markdownPath,
      markdownCharacters: markdown.length,
      nickname: payload.nickname,
      handle: payload.handle,
      cover: cover ? { path: cover.absolute, bytes: cover.bytes } : null,
      avatar: avatar ? { path: avatar.absolute, bytes: avatar.bytes } : null,
      maxCards,
      idempotencyKey,
      apiKeyConfigured: Boolean(process.env.CARDKAR_API_KEY),
    }, null, 2)}\n`);
    return;
  }

  const apiKey = process.env.CARDKAR_API_KEY || '';
  if (!/^ck_(?:test|live)_[A-Za-z0-9_-]{24,128}$/.test(apiKey)) {
    throw new Error('CARDKAR_API_KEY is missing or invalid. Configure it in the environment; do not pass it on the command line.');
  }

  const response = await fetch(`${baseUrl}/api/v1/skills/xhs-highlight/render`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'multipart/form-data',
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await errorMessage(response));
  if (!(response.headers.get('content-type') || '').toLowerCase().startsWith('multipart/form-data')) {
    throw new Error('CardKar returned an unexpected response type.');
  }

  const form = await response.formData();
  const rawManifest = form.get('manifest');
  if (typeof rawManifest !== 'string') throw new Error('CardKar response is missing the manifest.');
  const manifest = JSON.parse(rawManifest);
  const pages = form.getAll('pages');
  if (!pages.length || pages.length !== manifest.pageCount) {
    throw new Error('CardKar response page count does not match the manifest.');
  }

  await fs.mkdir(outdir, { recursive: true, mode: 0o700 });
  const written = [];
  for (let index = 0; index < pages.length; index += 1) {
    const page = pages[index];
    const filename = safeFilename(page.name || manifest.pages?.[index]?.filename, index);
    const outputPath = path.join(outdir, filename);
    await fs.writeFile(outputPath, Buffer.from(await page.arrayBuffer()), { mode: 0o600 });
    written.push(outputPath);
  }
  const manifestPath = path.join(outdir, 'manifest.json');
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });

  process.stdout.write(`${JSON.stringify({
    ok: true,
    skill: `${manifest.skill}@${manifest.version}`,
    artifactId: manifest.artifactId,
    pageCount: manifest.pageCount,
    billableUnits: manifest.billableUnits,
    creditsRemaining: Number.isSafeInteger(manifest.creditsRemaining) ? manifest.creditsRemaining : null,
    idempotencyReplay: manifest.idempotencyReplay,
    manifestPath,
    pages: written,
  }, null, 2)}\n`);
}

main().catch(error => {
  process.stderr.write(`CardKar client error: ${error.message}\n`);
  process.exitCode = 1;
});
