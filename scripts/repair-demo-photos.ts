import { createClient } from '@supabase/supabase-js';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';

const PHOTO_COUNTS: Record<string, number[]> = {
  'demo-hairstylist': [4, 4, 3],
  'demo-landscaper':  [4, 4, 3],
  'demo-plumber':     [3, 3, 4],
};

async function main() {
  const svc = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });

  for (const [slug, counts] of Object.entries(PHOTO_COUNTS)) {
    console.log('\n---', slug);
    const { data: org } = await svc.from('organizations').select('id').eq('portfolio_slug', slug).maybeSingle();
    if (!org) { console.log('  org not found'); continue; }

    const { data: projs } = await svc
      .from('projects').select('id, name, created_by').eq('org_id', org.id).order('created_at');
    if (!projs?.length) { console.log('  no projects'); continue; }

    const r2res = await r2.send(new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET!, Prefix: org.id + '/photos/', MaxKeys: 1000,
    }));
    const keys = (r2res.Contents ?? []).map((c) => c.Key!).sort();
    console.log(`  R2 objects: ${keys.length} | projects: ${projs.length}`);

    let keyIdx = 0;
    for (let pi = 0; pi < projs.length; pi++) {
      const proj = projs[pi];
      const need = counts[pi] ?? 3;
      const batch = keys.slice(keyIdx, keyIdx + need);
      keyIdx += need;
      if (!batch.length) { console.log(`  project ${pi} — no keys available`); continue; }

      const rows = batch.map((key, qi) => ({
        id: randomUUID(),
        org_id: org.id,
        project_id: proj.id,
        created_by: proj.created_by,
        name: `${proj.name} · ${qi + 1}`,
        object_key: key,
        status: 'active',
        upload_status: 'uploaded',
        created_at: new Date(Date.now() - (batch.length - qi) * 3_600_000).toISOString(),
      }));

      const { error } = await svc.from('photos').insert(rows);
      if (error) {
        console.log(`  project ${pi} insert error:`, error.message);
      } else {
        console.log(`  project ${pi} (${proj.name}) — inserted ${rows.length} photos`);
      }
    }
  }
  console.log('\nDone.');
}

main().catch((e) => { console.error(e); process.exit(1); });
