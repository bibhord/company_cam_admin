#!/usr/bin/env node
/**
 * Diagnose missing R2 objects for the demo organization's photos.
 *
 * Lists every photo row whose org belongs to demo@captureyourwork.com and HEADs
 * the corresponding R2 object. Reports which keys are missing.
 *
 * Usage: npx tsx scripts/check-demo-photos.ts
 */

import { createClient } from '@supabase/supabase-js';
import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';
import { readFileSync } from 'fs';
import { join } from 'path';

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
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

async function main() {
  const { data: demoUser } = await supabase
    .from('profiles')
    .select('org_id, user_id')
    .eq('user_id', (await supabase.auth.admin.listUsers()).data.users.find((u) => u.email === 'demo@captureyourwork.com')?.id ?? '')
    .maybeSingle();

  if (!demoUser?.org_id) {
    console.error('Could not find demo@captureyourwork.com or its org');
    process.exit(1);
  }

  console.log(`Demo org_id: ${demoUser.org_id}`);

  const { data: photos } = await supabase
    .from('photos')
    .select('id, name, object_key')
    .eq('org_id', demoUser.org_id);

  console.log(`Found ${photos?.length ?? 0} photo rows\n`);

  let missing = 0;
  let present = 0;
  for (const p of photos ?? []) {
    if (!p.object_key) {
      console.log(`[no key]  ${p.name} (${p.id})`);
      missing++;
      continue;
    }
    try {
      await r2.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: p.object_key }));
      console.log(`[ok]      ${p.object_key}`);
      present++;
    } catch (err) {
      const code = (err as { name?: string }).name ?? 'unknown';
      console.log(`[MISSING] ${p.object_key} (${code})`);
      missing++;
    }
  }

  console.log(`\nSummary: ${present} present, ${missing} missing`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
