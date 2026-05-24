#!/usr/bin/env node
/**
 * Re-seed the demo org by cloning reviewer@captureyourwork.com's projects + photos.
 *
 * Demo photo rows reuse the source org's R2 object_keys, so no binary copy
 * is performed. Existing demo projects and photos are wiped first.
 *
 * Usage:
 *   npx tsx scripts/reseed-demo-photos.ts            # apply
 *   npx tsx scripts/reseed-demo-photos.ts --dry-run  # show plan, change nothing
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';

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
const SOURCE_EMAIL = 'reviewer@captureyourwork.com';
const DEMO_EMAIL = 'demo@captureyourwork.com';

const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase env vars');
}

const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function orgIdForEmail(email: string): Promise<{ orgId: string; userId: string }> {
  const { data: users } = await supabase.auth.admin.listUsers();
  const user = users.users.find((u) => u.email === email);
  if (!user) throw new Error(`No auth user found for ${email}`);
  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!profile?.org_id) throw new Error(`No profile/org for ${email}`);
  return { orgId: profile.org_id, userId: user.id };
}

async function main() {
  const source = await orgIdForEmail(SOURCE_EMAIL);
  const demo = await orgIdForEmail(DEMO_EMAIL);

  console.log(`Source org: ${source.orgId} (${SOURCE_EMAIL})`);
  console.log(`Demo org:   ${demo.orgId} (${DEMO_EMAIL})`);
  console.log(DRY_RUN ? '\n[DRY RUN] No changes will be made.\n' : '');

  const { data: sourceProjects } = await supabase
    .from('projects')
    .select('id, name')
    .eq('org_id', source.orgId);

  if (!sourceProjects?.length) {
    console.error(`Source org has no projects.`);
    return;
  }

  const { data: sourcePhotos } = await supabase
    .from('photos')
    .select('id, project_id, name, notes, tags, lat, lon, status, upload_status, object_key, url, created_at')
    .eq('org_id', source.orgId);

  console.log(`Source has ${sourceProjects.length} projects, ${sourcePhotos?.length ?? 0} photos`);

  if (!DRY_RUN) {
    const { error: delPhotos } = await supabase.from('photos').delete().eq('org_id', demo.orgId);
    if (delPhotos) throw delPhotos;
    const { error: delProjects } = await supabase.from('projects').delete().eq('org_id', demo.orgId);
    if (delProjects) throw delProjects;
    console.log('Wiped existing demo projects and photos.');
  }

  let copiedProjects = 0;
  let copiedPhotos = 0;
  const projectIdMap: Record<string, string> = {};

  for (const proj of sourceProjects) {
    if (DRY_RUN) {
      projectIdMap[proj.id] = `[new-id-for:${proj.id}]`;
      copiedProjects++;
      continue;
    }
    const newProjectId = randomUUID();
    const { error } = await supabase
      .from('projects')
      .insert({ id: newProjectId, name: proj.name, org_id: demo.orgId, created_by: demo.userId });
    if (error) {
      console.error(`Failed to create project "${proj.name}":`, error.message);
      continue;
    }
    projectIdMap[proj.id] = newProjectId;
    copiedProjects++;
  }

  for (const photo of sourcePhotos ?? []) {
    const newProjectId = projectIdMap[photo.project_id];
    if (!newProjectId) {
      console.warn(`Skipping photo ${photo.id} — no mapped project`);
      continue;
    }
    if (DRY_RUN) {
      copiedPhotos++;
      continue;
    }
    const { error } = await supabase.from('photos').insert({
      id: randomUUID(),
      org_id: demo.orgId,
      project_id: newProjectId,
      created_by: demo.userId,
      name: photo.name,
      notes: photo.notes,
      tags: photo.tags,
      lat: photo.lat,
      lon: photo.lon,
      status: photo.status,
      upload_status: photo.upload_status,
      object_key: photo.object_key,
      url: photo.url,
      created_at: photo.created_at,
    });
    if (error) {
      console.error(`Failed to insert photo "${photo.name}":`, error.message);
      continue;
    }
    copiedPhotos++;
  }

  console.log(`\nDone. Projects: ${copiedProjects}, Photos: ${copiedPhotos}${DRY_RUN ? ' (dry-run)' : ''}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
