#!/usr/bin/env node
/**
 * One-time migration: copy every object from the Supabase Storage `photos` bucket
 * into Cloudflare R2, preserving the same object keys so DB rows don't need updating.
 *
 * Usage:
 *   npx tsx scripts/migrate-photos-to-r2.ts           # migrate
 *   npx tsx scripts/migrate-photos-to-r2.ts --dry-run # list only, no copy
 *
 * Env vars (pulled from .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   R2_ACCOUNT_ID, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY
 */

import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load .env.local manually (tsx doesn't auto-load it)
const envPath = join(process.cwd(), '.env.local');
try {
  const envFile = readFileSync(envPath, 'utf-8');
  for (const line of envFile.split('\n')) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].trim().replace(/^["']|["']$/g, '');
    }
  }
} catch {
  console.warn('Could not load .env.local');
}

const DRY_RUN = process.argv.includes('--dry-run');
const SKIP_EXISTING = !process.argv.includes('--force');

const {
  NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  R2_ACCOUNT_ID,
  R2_BUCKET,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
} = process.env;

if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase env vars');
}
if (!R2_ACCOUNT_ID || !R2_BUCKET || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  throw new Error('Missing R2 env vars');
}

const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

async function listAllKeys(prefix = ''): Promise<string[]> {
  const keys: string[] = [];
  const seenFolders = new Set<string>();
  const queue: string[] = [prefix];

  while (queue.length > 0) {
    const current = queue.shift()!;
    let offset = 0;
    const limit = 100;
    while (true) {
      const { data, error } = await supabase.storage.from('photos').list(current, {
        limit,
        offset,
        sortBy: { column: 'name', order: 'asc' },
      });
      if (error) {
        console.error(`list error at "${current}":`, error);
        break;
      }
      if (!data || data.length === 0) break;

      for (const item of data) {
        const path = current ? `${current}/${item.name}` : item.name;
        if (item.id === null || !item.metadata) {
          if (!seenFolders.has(path)) {
            seenFolders.add(path);
            queue.push(path);
          }
        } else {
          keys.push(path);
        }
      }
      if (data.length < limit) break;
      offset += limit;
    }
  }
  return keys;
}

async function objectExistsInR2(key: string): Promise<boolean> {
  try {
    await r2.send(new HeadObjectCommand({ Bucket: R2_BUCKET!, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function copyOne(key: string): Promise<void> {
  if (SKIP_EXISTING && (await objectExistsInR2(key))) {
    console.log(`  ⏭  skip (already in R2): ${key}`);
    return;
  }

  const { data: blob, error } = await supabase.storage.from('photos').download(key);
  if (error || !blob) {
    console.error(`  ✖  download failed: ${key}`, error);
    return;
  }
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const contentType = blob.type || 'application/octet-stream';

  await r2.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET!,
      Key: key,
      Body: bytes,
      ContentType: contentType,
    }),
  );
  console.log(`  ✔  copied: ${key} (${(bytes.byteLength / 1024).toFixed(1)} KB)`);
}

async function main() {
  console.log('⬇️  Listing all objects in Supabase Storage bucket "photos"…');
  const keys = await listAllKeys();
  console.log(`   Found ${keys.length} objects`);

  if (DRY_RUN) {
    keys.forEach((k) => console.log(`   ${k}`));
    console.log('\nDry run — nothing copied.');
    return;
  }

  console.log(`\n⬆️  Copying to R2 bucket "${R2_BUCKET}"…`);
  let copied = 0;
  let failed = 0;
  for (const key of keys) {
    try {
      await copyOne(key);
      copied++;
    } catch (err) {
      console.error(`  ✖  copy failed: ${key}`, err);
      failed++;
    }
  }

  console.log(`\n✅ Done. ${copied} succeeded, ${failed} failed out of ${keys.length}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
