-- =====================================================================
-- Real Estate Photographer Demo Setup
-- =====================================================================
-- PREREQUISITE: Sign up for the account FIRST via the normal signup flow:
--   1. Go to https://app.captureyourwork.com/signup
--   2. Email: realestate-demo@captureyourwork.com
--      Password: (any 6+ char password — pick one you'll remember)
--      First name: Demo  /  Last name: Photographer
--   3. Confirm the email (click the link in your inbox)
--
-- THEN run this entire SQL block in Supabase SQL editor.
-- It is idempotent — safe to re-run.
-- =====================================================================

DO $$
DECLARE
  v_user_id uuid;
  v_org_id  uuid;
  v_cat_photo uuid;
  v_cat_video uuid;
  v_cat_addon uuid;
  v_proj_1 uuid;
  v_proj_2 uuid;
BEGIN
  -- Look up the demo account's user_id and org_id
  SELECT au.id, p.org_id
    INTO v_user_id, v_org_id
  FROM auth.users au
  JOIN public.profiles p ON p.user_id = au.id
  WHERE au.email = 'realestate-demo@captureyourwork.com'
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Account realestate-demo@captureyourwork.com not found. Sign up first via /signup, confirm the email, then re-run this script.';
  END IF;

  -- 1. Organization: name, slug, active, published
  UPDATE public.organizations
  SET name              = 'Tony Townsend Photography',
      portfolio_slug    = 'tonytownsend-demo',
      portfolio_published = false,   -- we'll publish at the end after photos exist
      status            = 'active'
  WHERE id = v_org_id;

  -- 2. Service categories
  INSERT INTO public.service_categories (org_id, name, sort_order)
  VALUES (v_org_id, 'Photography Packages', 1)
  ON CONFLICT DO NOTHING;
  SELECT id INTO v_cat_photo FROM public.service_categories
    WHERE org_id = v_org_id AND name = 'Photography Packages';

  INSERT INTO public.service_categories (org_id, name, sort_order)
  VALUES (v_org_id, 'Video & 3D', 2)
  ON CONFLICT DO NOTHING;
  SELECT id INTO v_cat_video FROM public.service_categories
    WHERE org_id = v_org_id AND name = 'Video & 3D';

  INSERT INTO public.service_categories (org_id, name, sort_order)
  VALUES (v_org_id, 'Add-Ons', 3)
  ON CONFLICT DO NOTHING;
  SELECT id INTO v_cat_addon FROM public.service_categories
    WHERE org_id = v_org_id AND name = 'Add-Ons';

  -- 3. Services (delete existing demo services first so re-runs reset cleanly)
  DELETE FROM public.services WHERE org_id = v_org_id;

  INSERT INTO public.services (org_id, category_id, name, description, duration_min, price_cents, price_type, is_active, sort_order) VALUES
    -- Photography Packages
    (v_org_id, v_cat_photo, 'HDR Photos — up to 1500 sqft',  '25 professionally edited HDR photos. Standard 24hr turnaround.', 60,  19900, 'fixed', true, 1),
    (v_org_id, v_cat_photo, 'HDR Photos — 1501–3000 sqft',   '35 professionally edited HDR photos. Standard 24hr turnaround.', 90,  24900, 'fixed', true, 2),
    (v_org_id, v_cat_photo, 'HDR Photos — 3001+ sqft',       '50+ professionally edited HDR photos. Standard 24hr turnaround.', 120, 29900, 'fixed', true, 3),
    (v_org_id, v_cat_photo, 'Twilight Photos',               '5 dusk/twilight exterior shots. Scheduled separately from daytime.', 45,  15000, 'fixed', true, 4),
    -- Video & 3D
    (v_org_id, v_cat_video, 'Walkthrough Video',             '60–90 second cinematic walkthrough, music + branding included.',     60,  24900, 'fixed', true, 1),
    (v_org_id, v_cat_video, 'Aerial Drone Photos & Video',   '10 aerial photos + 30s aerial video clip.',                          45,  19900, 'fixed', true, 2),
    (v_org_id, v_cat_video, '3D Matterport Tour',            'Full interactive 3D walkthrough. Pricing per sqft on request.',      90,  34900, 'fixed', true, 3),
    -- Add-Ons
    (v_org_id, v_cat_addon, 'Floor Plan (2D)',               'Schematic 2D floor plan with room dimensions.',                     30,  7900,  'fixed', true, 1),
    (v_org_id, v_cat_addon, 'Virtual Staging',               'Per photo. Empty rooms staged with modern furniture.',              0,   4500,  'fixed', true, 2),
    (v_org_id, v_cat_addon, 'Rush Delivery — 12hr',          'Edited photos delivered within 12 hours of shoot.',                 0,   5000,  'fixed', true, 3),
    (v_org_id, v_cat_addon, 'Property Website',              'Single-property landing page with photos, video, and map.',         0,   9900,  'fixed', true, 4);

  -- 4. Business hours — Tue–Sat 8am–6pm (realtors mostly book weekdays + Sat)
  DELETE FROM public.business_hours WHERE org_id = v_org_id;
  INSERT INTO public.business_hours (org_id, day_of_week, open_time, close_time, is_closed) VALUES
    (v_org_id, 0, '09:00:00', '17:00:00', true),   -- Sun closed
    (v_org_id, 1, '08:00:00', '18:00:00', false),  -- Mon
    (v_org_id, 2, '08:00:00', '18:00:00', false),  -- Tue
    (v_org_id, 3, '08:00:00', '18:00:00', false),  -- Wed
    (v_org_id, 4, '08:00:00', '18:00:00', false),  -- Thu
    (v_org_id, 5, '08:00:00', '18:00:00', false),  -- Fri
    (v_org_id, 6, '09:00:00', '15:00:00', false);  -- Sat shorter day

  -- 5. Two sample projects (= past shoots) marked completed + featured
  -- We use deterministic IDs so re-runs upsert cleanly.
  v_proj_1 := uuid_generate_v5('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', v_org_id::text || ':project:hillside-modern');
  v_proj_2 := uuid_generate_v5('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', v_org_id::text || ':project:downtown-loft');

  INSERT INTO public.projects (id, org_id, created_by, name, street_address, city, state_zip, status, featured)
  VALUES
    (v_proj_1, v_org_id, v_user_id, '4218 Hillside Drive — Modern Family Home',  '4218 Hillside Drive', 'Salt Lake City', 'UT 84103', 'completed', true),
    (v_proj_2, v_org_id, v_user_id, '120 W South Temple — Downtown Loft',         '120 W South Temple',  'Salt Lake City', 'UT 84101', 'completed', true)
  ON CONFLICT (id) DO UPDATE
    SET status = EXCLUDED.status,
        featured = EXCLUDED.featured,
        street_address = EXCLUDED.street_address,
        city = EXCLUDED.city,
        state_zip = EXCLUDED.state_zip;

  RAISE NOTICE 'Demo account ready. user_id=%, org_id=%', v_user_id, v_org_id;
  RAISE NOTICE 'Slug: tonytownsend-demo  →  https://tonytownsend-demo.captureyourwork.com (after publish)';
END $$;

-- =====================================================================
-- NEXT STEPS (manual, ~5 min):
--   1. Impersonate realestate-demo@captureyourwork.com from /superadmin/orgs
--   2. Open each of the 2 projects and click "Upload Photos" — drop in
--      5–10 real-estate photos per project (download free shots from
--      pexels.com/search/luxury-home or unsplash.com/s/photos/real-estate).
--      Use the Before/After toggle if you want to demo that too.
--   3. Go to /admin/portfolio and click Publish.
--   4. Visit https://tonytownsend-demo.captureyourwork.com
--      and https://tonytownsend-demo.captureyourwork.com/book to see the
--      booking form populated with the photographer services.
-- =====================================================================
