import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { SERVICE_TEMPLATES } from '../src/lib/service-templates.js';

const svc = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const DEMO_TEMPLATES: Record<string, string> = {
  'demo-hairstylist': 'salon',
  'demo-landscaper':  'landscaper',
  'demo-plumber':     'plumber',
};

async function main() {
  for (const [slug, templateKey] of Object.entries(DEMO_TEMPLATES)) {
    console.log(`\n--- ${slug} (template: ${templateKey})`);

    const { data: org } = await svc
      .from('organizations').select('id').eq('portfolio_slug', slug).maybeSingle();
    if (!org) { console.log('  org not found — skipping'); continue; }

    const template = SERVICE_TEMPLATES.find((t) => t.key === templateKey);
    if (!template) { console.log('  template not found — skipping'); continue; }

    // Wipe any existing services so re-runs are idempotent
    await svc.from('services').delete().eq('org_id', org.id);
    await svc.from('service_categories').delete().eq('org_id', org.id);

    for (let ci = 0; ci < template.categories.length; ci++) {
      const cat = template.categories[ci];
      const { data: catRow, error: catErr } = await svc
        .from('service_categories')
        .insert({ id: randomUUID(), org_id: org.id, name: cat.name, sort_order: ci })
        .select('id').single();
      if (catErr || !catRow) { console.log(`  category insert failed: ${catErr?.message}`); continue; }

      const rows = cat.services.map((s, si) => ({
        id: randomUUID(),
        org_id: org.id,
        category_id: catRow.id,
        name: s.name,
        description: s.description ?? null,
        duration_min: s.duration_min,
        price_cents: s.price_cents,
        price_type: s.price_type,
        sort_order: si,
        is_active: true,
      }));
      const { error: svcErr } = await svc.from('services').insert(rows);
      if (svcErr) {
        console.log(`  services insert failed for "${cat.name}": ${svcErr.message}`);
      } else {
        console.log(`  ${cat.name} — ${rows.length} services`);
      }
    }
  }
  console.log('\nDone.');
}

main().catch((e) => { console.error(e); process.exit(1); });
