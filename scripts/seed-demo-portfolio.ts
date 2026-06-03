#!/usr/bin/env tsx
/**
 * Seeds demo portfolio orgs (hairstylist / landscaper / plumber) so we can
 * point prospects at real, published portfolios at:
 *   demo-hairstylist.captureyourwork.com
 *   demo-landscaper.captureyourwork.com
 *   demo-plumber.captureyourwork.com
 *
 * SETUP (one-time):
 *   1. Create a free Unsplash dev account at https://unsplash.com/developers
 *      and add UNSPLASH_ACCESS_KEY=... to .env.local.
 *   2. Make sure .env.local also has NEXT_PUBLIC_SUPABASE_URL,
 *      SUPABASE_SERVICE_ROLE_KEY, R2_ACCOUNT_ID, R2_BUCKET,
 *      R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY.
 *
 * USAGE (Node 20.6+):
 *   node --env-file=.env.local --import=tsx scripts/seed-demo-portfolio.ts hairstylist
 *   node --env-file=.env.local --import=tsx scripts/seed-demo-portfolio.ts all
 *   node --env-file=.env.local --import=tsx scripts/seed-demo-portfolio.ts --dry-run all
 *
 * The script is idempotent: re-running reuses the existing org + admin user
 * but creates fresh projects + photos each time. Wipe via the SQL editor if
 * you want a clean slate.
 */

import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';

const ADMIN_PASSWORD = 'DemoUser2026!';
const ANNOTATION_COLORS = ['#ef4444', '#f59e0b', '#3b82f6'] as const;

interface ProjectConfig {
  name: string;
  street_address: string;
  city: string;
  state_zip: string;
  lat: number;
  lng: number;
  /** Unsplash queries; one query → one photo. */
  photo_queries: string[];
  /** If true, the first two photos become a before/after pair. */
  before_after_pair?: boolean;
}

interface VerticalConfig {
  slug: string;
  org_name: string;
  admin_email: string;
  first_name: string;
  last_name: string;
  projects: ProjectConfig[];
}

const VERTICALS: Record<string, VerticalConfig> = {
  hairstylist: {
    slug: 'demo-hairstylist',
    org_name: "Bella's Hair Studio",
    admin_email: 'demo-hairstylist@captureyourwork.com',
    first_name: 'Bella',
    last_name: 'Demo',
    projects: [
      {
        name: 'Bridal Updo · Sarah',
        street_address: '450 Park Ave',
        city: 'New York',
        state_zip: 'NY 10022',
        lat: 40.7616,
        lng: -73.9719,
        photo_queries: ['bridal updo hairstyle', 'wedding hairstyle bride', 'bridal hair flowers', 'wedding salon mirror'],
        before_after_pair: true,
      },
      {
        name: 'Balayage Color · Emma',
        street_address: '88 Bowery',
        city: 'New York',
        state_zip: 'NY 10013',
        lat: 40.717,
        lng: -73.997,
        photo_queries: ['balayage hair color', 'hair foils salon', 'long hair brunette balayage', 'blonde hair highlights'],
        before_after_pair: true,
      },
      {
        name: 'Mens Fade · Marco',
        street_address: '210 W 14th St',
        city: 'New York',
        state_zip: 'NY 10011',
        lat: 40.738,
        lng: -73.998,
        photo_queries: ['mens haircut fade barber', 'beard trim barber shop', 'mens haircut salon'],
      },
    ],
  },
  landscaper: {
    slug: 'demo-landscaper',
    org_name: 'GreenScape Pros',
    admin_email: 'demo-landscaper@captureyourwork.com',
    first_name: 'Greg',
    last_name: 'Demo',
    projects: [
      {
        name: 'Front Yard Lawn Install · Smith Residence',
        street_address: '4501 Magnolia Dr',
        city: 'Austin',
        state_zip: 'TX 78704',
        lat: 30.2515,
        lng: -97.7634,
        photo_queries: ['front yard lawn', 'sod lawn installation', 'green lawn house', 'lawn sprinkler grass'],
        before_after_pair: true,
      },
      {
        name: 'Backyard Patio & Pavers · Garcia Residence',
        street_address: '12 Oakwood Ln',
        city: 'Austin',
        state_zip: 'TX 78745',
        lat: 30.2241,
        lng: -97.8056,
        photo_queries: ['paver patio backyard', 'stone patio garden', 'pergola patio backyard', 'flagstone walkway garden'],
        before_after_pair: true,
      },
      {
        name: 'Garden Beds Refresh · Pinecrest HOA',
        street_address: '7200 Pinecrest Way',
        city: 'Austin',
        state_zip: 'TX 78731',
        lat: 30.3461,
        lng: -97.7589,
        photo_queries: ['flower garden bed mulch', 'shrubs garden landscape', 'mulched garden bed'],
      },
    ],
  },
  plumber: {
    slug: 'demo-plumber',
    org_name: 'ProFlow Plumbing',
    admin_email: 'demo-plumber@captureyourwork.com',
    first_name: 'Pat',
    last_name: 'Demo',
    projects: [
      {
        name: 'Water Heater Install · 50gal · Johnson',
        street_address: '988 Sunset Blvd',
        city: 'Denver',
        state_zip: 'CO 80205',
        lat: 39.7549,
        lng: -104.9712,
        photo_queries: ['water heater installation basement', 'water heater plumber', 'hot water tank install'],
        before_after_pair: true,
      },
      {
        name: 'Burst Pipe Repair · Basement',
        street_address: '142 Spruce St',
        city: 'Denver',
        state_zip: 'CO 80206',
        lat: 39.7392,
        lng: -104.951,
        photo_queries: ['burst pipe water leak', 'copper pipe repair plumber', 'pipe leak basement'],
        before_after_pair: true,
      },
      {
        name: 'Bathroom Remodel · Master · Chen',
        street_address: '350 Cherry Hill Rd',
        city: 'Denver',
        state_zip: 'CO 80246',
        lat: 39.7032,
        lng: -104.9244,
        photo_queries: ['bathroom remodel plumbing', 'bathtub installation', 'shower drain plumber', 'bathroom faucet new'],
      },
    ],
  },
};

// ── Env + clients ───────────────────────────────────────────────────────

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing env: ${name}`);
    process.exit(1);
  }
  return v;
}

const SUPABASE_URL = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
const R2_ACCOUNT_ID = requireEnv('R2_ACCOUNT_ID');
const R2_BUCKET = requireEnv('R2_BUCKET');
const R2_ACCESS_KEY_ID = requireEnv('R2_ACCESS_KEY_ID');
const R2_SECRET_ACCESS_KEY = requireEnv('R2_SECRET_ACCESS_KEY');
const UNSPLASH_ACCESS_KEY = requireEnv('UNSPLASH_ACCESS_KEY');
const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
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

// ── Unsplash + R2 helpers ──────────────────────────────────────────────

async function fetchUnsplash(query: string): Promise<{ id: string; url: string } | null> {
  const url = `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&orientation=landscape`;
  const res = await fetch(url, {
    headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` },
  });
  if (!res.ok) {
    console.warn(`  Unsplash ${res.status} for "${query}": ${await res.text()}`);
    return null;
  }
  const body = (await res.json()) as { id: string; urls: { regular: string } };
  return { id: body.id, url: body.urls.regular };
}

async function downloadImage(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function uploadToR2(buf: Buffer, key: string): Promise<void> {
  await r2.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: buf,
      ContentType: 'image/jpeg',
    }),
  );
}

async function registerVercelDomain(host: string): Promise<void> {
  if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) {
    console.warn(`  [vercel] skipping ${host} — VERCEL_TOKEN/VERCEL_PROJECT_ID not set`);
    return;
  }
  const teamQs = VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : '';
  const res = await fetch(`https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains${teamQs}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${VERCEL_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: host }),
  });
  if (res.ok) {
    console.log(`  [vercel] added ${host}`);
    return;
  }
  const body = (await res.json().catch(() => null)) as { error?: { code?: string; message?: string } } | null;
  if (body?.error?.code === 'domain_already_exists') {
    console.log(`  [vercel] ${host} already attached`);
    return;
  }
  console.warn(`  [vercel] failed to add ${host}: ${body?.error?.message ?? res.status}`);
}

// ── Per-vertical seeder ─────────────────────────────────────────────────

async function findUserByEmail(email: string): Promise<string | null> {
  // listUsers is paginated; one page (50) is enough for our handful of demo users.
  const { data } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
  const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  return found?.id ?? null;
}

async function seedVertical(key: string, dryRun: boolean) {
  const cfg = VERTICALS[key];
  if (!cfg) {
    console.error(`Unknown vertical: ${key}`);
    return;
  }
  console.log(`\n━━━ ${cfg.org_name} (${cfg.slug}) ━━━`);

  if (dryRun) {
    const photoCount = cfg.projects.reduce((s, p) => s + p.photo_queries.length, 0);
    console.log(`[dry-run] would create org + ${cfg.projects.length} projects + ${photoCount} photos`);
    return;
  }

  // 1. Org — reuse if slug already exists
  let orgId: string;
  const { data: existingOrg } = await supabase
    .from('organizations')
    .select('id')
    .eq('portfolio_slug', cfg.slug)
    .maybeSingle();
  if (existingOrg) {
    orgId = existingOrg.id;
    await supabase
      .from('organizations')
      .update({ name: cfg.org_name, portfolio_published: true })
      .eq('id', orgId);
    console.log(`Reusing org ${orgId}`);
  } else {
    const { data: created, error } = await supabase
      .from('organizations')
      .insert({ name: cfg.org_name, portfolio_slug: cfg.slug, portfolio_published: true })
      .select('id')
      .single();
    if (error || !created) throw new Error(`Org create: ${error?.message}`);
    orgId = created.id;
    console.log(`Created org ${orgId}`);
  }

  // 2. Admin user — reuse if email already exists
  let userId = await findUserByEmail(cfg.admin_email);
  if (userId) {
    console.log(`Reusing user ${userId}`);
  } else {
    const { data: created, error } = await supabase.auth.admin.createUser({
      email: cfg.admin_email,
      password: ADMIN_PASSWORD,
      email_confirm: true,
    });
    if (error || !created.user) throw new Error(`User create: ${error?.message}`);
    userId = created.user.id;
    console.log(`Created user ${userId}`);
  }

  // 3. Profile — upsert
  await supabase.from('profiles').upsert({
    user_id: userId,
    org_id: orgId,
    first_name: cfg.first_name,
    last_name: cfg.last_name,
    role: 'admin',
    is_admin: true,
    is_active: true,
    onboarding_complete: true,
  });

  // 4. Projects + photos
  for (const projCfg of cfg.projects) {
    const { data: project, error: projErr } = await supabase
      .from('projects')
      .insert({
        org_id: orgId,
        name: projCfg.name,
        status: 'completed',
        featured: true,
        street_address: projCfg.street_address,
        city: projCfg.city,
        state_zip: projCfg.state_zip,
        lat: projCfg.lat,
        lng: projCfg.lng,
        created_by: userId,
      })
      .select('id')
      .single();
    if (projErr || !project) {
      console.warn(`  project insert failed:`, projErr?.message);
      continue;
    }
    console.log(`  Project ${project.id} — ${projCfg.name}`);

    const photoIds: string[] = [];
    for (let qi = 0; qi < projCfg.photo_queries.length; qi++) {
      const query = projCfg.photo_queries[qi];
      try {
        const hit = await fetchUnsplash(query);
        if (!hit) continue;
        const buf = await downloadImage(hit.url);
        const objectKey = `${orgId}/photos/${randomUUID()}.jpg`;
        await uploadToR2(buf, objectKey);
        const captureTs = new Date(Date.now() - (projCfg.photo_queries.length - qi) * 3600_000).toISOString();
        const { data: photo, error: photoErr } = await supabase
          .from('photos')
          .insert({
            org_id: orgId,
            project_id: project.id,
            created_by: userId,
            name: `${projCfg.name} · ${qi + 1}`,
            object_key: objectKey,
            status: 'published',
            upload_status: 'uploaded',
            lat: projCfg.lat,
            lon: projCfg.lng,
            created_at: captureTs,
          })
          .select('id')
          .single();
        if (photoErr || !photo) {
          console.warn(`    photo insert failed:`, photoErr?.message);
          continue;
        }
        photoIds.push(photo.id);
        console.log(`    + photo (${query})`);
      } catch (e) {
        console.warn(`    photo fetch failed for "${query}":`, e instanceof Error ? e.message : e);
      }
    }

    // Before/after pair: photos[1] becomes the "after" of photos[0]
    if (projCfg.before_after_pair && photoIds.length >= 2) {
      await supabase.from('photos').update({ before_photo_id: photoIds[0] }).eq('id', photoIds[1]);
      console.log(`    paired photos[1] as after of photos[0]`);
    }

    // Drop one annotation onto the third photo (if available) so the demo
    // showcases the markup feature.
    if (photoIds.length >= 3) {
      await supabase.from('photo_annotations').insert({
        photo_id: photoIds[2],
        org_id: orgId,
        data: {
          version: 1,
          shapes: [
            {
              id: randomUUID(),
              type: 'arrow',
              from: [800, 1600],
              to: [1400, 700],
              color: ANNOTATION_COLORS[0],
              strokeWidth: 80,
            },
            {
              id: randomUUID(),
              type: 'pen',
              points: [1400, 700, 1500, 650, 1620, 600, 1700, 580],
              color: ANNOTATION_COLORS[1],
              strokeWidth: 60,
            },
          ],
        },
        updated_by: userId,
      });
      console.log(`    annotated photos[2]`);
    }
  }

  // 5. Register the subdomain with Vercel so it actually resolves.
  await registerVercelDomain(`${cfg.slug}.captureyourwork.com`);

  console.log(`✓ ${cfg.slug}.captureyourwork.com is live\n`);
}

// ── Entry point ─────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const target = args.find((a) => !a.startsWith('--'));
  if (!target) {
    console.error('Usage: node --env-file=.env.local --import=tsx scripts/seed-demo-portfolio.ts <hairstylist|landscaper|plumber|all> [--dry-run]');
    process.exit(1);
  }
  const keys = target === 'all' ? Object.keys(VERTICALS) : [target];
  for (const k of keys) {
    await seedVertical(k, dryRun);
  }
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
