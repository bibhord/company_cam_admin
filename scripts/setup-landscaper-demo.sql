-- =====================================================================
-- Landscaper Demo Setup
-- =====================================================================
-- PREREQUISITE: demo-landscaper@captureyourwork.com must exist already
-- (sign up + email confirm, OR mark email_confirmed_at via auth.users).
-- Also run ensure-all-schema.sql first so the schema is in place.
--
-- Idempotent — safe to re-run.
-- =====================================================================

DO $$
DECLARE
  v_user_id uuid;
  v_org_id  uuid;
  v_cat_lawn uuid;
  v_cat_cleanup uuid;
  v_cat_design uuid;
  v_proj_1 uuid;
  v_proj_2 uuid;
BEGIN
  SELECT au.id, p.org_id INTO v_user_id, v_org_id
  FROM auth.users au
  JOIN public.profiles p ON p.user_id = au.id
  WHERE au.email = 'demo-landscaper@captureyourwork.com'
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Account demo-landscaper@captureyourwork.com not found.';
  END IF;

  -- Organization
  UPDATE public.organizations
  SET name              = 'Mountain View Landscaping',
      portfolio_slug    = 'mountainview-landscape',
      portfolio_published = false,
      status            = 'active'
  WHERE id = v_org_id;

  -- Categories
  INSERT INTO public.service_categories (org_id, name, sort_order) VALUES (v_org_id, 'Lawn Care', 1) ON CONFLICT DO NOTHING;
  SELECT id INTO v_cat_lawn FROM public.service_categories WHERE org_id = v_org_id AND name = 'Lawn Care';

  INSERT INTO public.service_categories (org_id, name, sort_order) VALUES (v_org_id, 'Seasonal Cleanup', 2) ON CONFLICT DO NOTHING;
  SELECT id INTO v_cat_cleanup FROM public.service_categories WHERE org_id = v_org_id AND name = 'Seasonal Cleanup';

  INSERT INTO public.service_categories (org_id, name, sort_order) VALUES (v_org_id, 'Design & Install', 3) ON CONFLICT DO NOTHING;
  SELECT id INTO v_cat_design FROM public.service_categories WHERE org_id = v_org_id AND name = 'Design & Install';

  -- Services
  DELETE FROM public.services WHERE org_id = v_org_id;
  INSERT INTO public.services (org_id, category_id, name, description, duration_min, price_cents, price_type, is_active, sort_order) VALUES
    (v_org_id, v_cat_lawn,    'Lawn Mowing — Standard',     'Up to 1/4 acre. Includes trimming and blowing.',                     60,  4500,  'fixed', true, 1),
    (v_org_id, v_cat_lawn,    'Lawn Mowing — Premium',      'Up to 1/2 acre. Includes edging, trimming, and cleanup.',            90,  7500,  'fixed', true, 2),
    (v_org_id, v_cat_lawn,    'Hedge Trimming',             'Per hour. Includes haul-away of clippings.',                         60,  15000, 'from',  true, 3),
    (v_org_id, v_cat_cleanup, 'Spring Cleanup',             'Yard de-thatch, debris removal, first mow, mulch refresh.',          240, 24900, 'fixed', true, 1),
    (v_org_id, v_cat_cleanup, 'Fall Cleanup',               'Leaf removal, gutter clearing, winterize sprinklers.',               240, 29900, 'fixed', true, 2),
    (v_org_id, v_cat_cleanup, 'Mulching',                   'Per cubic yard delivered + spread.',                                 90,  24900, 'from',  true, 3),
    (v_org_id, v_cat_design,  'Garden Design Consultation', '1-hour walk-through with planting plan + cost estimate.',            60,  15000, 'fixed', true, 1),
    (v_org_id, v_cat_design,  'Sod Installation',           'Per project, includes soil prep + delivery. Quote on site.',         0,   0,     'from',  true, 2),
    (v_org_id, v_cat_design,  'Irrigation Install / Repair','Drip and sprinkler systems. Quote based on yard size.',              0,   0,     'from',  true, 3),
    (v_org_id, v_cat_design,  'Tree Pruning',               'Per tree, up to 15ft. Larger trees quoted separately.',              60,  19900, 'from',  true, 4);

  -- Business hours: Mon-Sat 7am-5pm (landscapers start early)
  DELETE FROM public.business_hours WHERE org_id = v_org_id;
  INSERT INTO public.business_hours (org_id, day_of_week, open_time, close_time, is_closed) VALUES
    (v_org_id, 0, '09:00:00', '17:00:00', true),
    (v_org_id, 1, '07:00:00', '17:00:00', false),
    (v_org_id, 2, '07:00:00', '17:00:00', false),
    (v_org_id, 3, '07:00:00', '17:00:00', false),
    (v_org_id, 4, '07:00:00', '17:00:00', false),
    (v_org_id, 5, '07:00:00', '17:00:00', false),
    (v_org_id, 6, '08:00:00', '14:00:00', false);

  -- Projects
  v_proj_1 := uuid_generate_v5('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', v_org_id::text || ':project:highland-backyard');
  v_proj_2 := uuid_generate_v5('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', v_org_id::text || ':project:capitol-frontyard');

  INSERT INTO public.projects (id, org_id, created_by, name, street_address, city, state_zip, status, featured) VALUES
    (v_proj_1, v_org_id, v_user_id, 'Highland Park — Backyard Transformation', '2841 E Highland Drive', 'Salt Lake City', 'UT 84106', 'completed', true),
    (v_proj_2, v_org_id, v_user_id, 'Capitol Hill — Front Yard Refresh',       '475 N State Street',    'Salt Lake City', 'UT 84103', 'completed', true)
  ON CONFLICT (id) DO UPDATE
    SET status = EXCLUDED.status, featured = EXCLUDED.featured;

  -- Photos
  DELETE FROM public.photos WHERE project_id IN (v_proj_1, v_proj_2);

  INSERT INTO public.photos (id, org_id, project_id, created_by, name, url, status, upload_status, bucket) VALUES
    -- Highland Park backyard
    (gen_random_uuid(), v_org_id, v_proj_1, v_user_id, 'Before — Overgrown',          'https://images.pexels.com/photos/1108572/pexels-photo-1108572.jpeg?auto=compress&cs=tinysrgb&w=1600', 'active', 'uploaded', 'before'),
    (gen_random_uuid(), v_org_id, v_proj_1, v_user_id, 'After — Manicured Lawn',      'https://images.pexels.com/photos/259588/pexels-photo-259588.jpeg?auto=compress&cs=tinysrgb&w=1600',   'active', 'uploaded', 'after'),
    (gen_random_uuid(), v_org_id, v_proj_1, v_user_id, 'Patio + Plantings',           'https://images.pexels.com/photos/1408221/pexels-photo-1408221.jpeg?auto=compress&cs=tinysrgb&w=1600', 'active', 'uploaded', 'after'),
    (gen_random_uuid(), v_org_id, v_proj_1, v_user_id, 'New Garden Beds',             'https://images.pexels.com/photos/1108572/pexels-photo-1108572.jpeg?auto=compress&cs=tinysrgb&w=1600', 'active', 'uploaded', 'after'),
    (gen_random_uuid(), v_org_id, v_proj_1, v_user_id, 'Hardscape Pathway',           'https://images.pexels.com/photos/207151/pexels-photo-207151.jpeg?auto=compress&cs=tinysrgb&w=1600',  'active', 'uploaded', 'after'),
    -- Capitol Hill front yard
    (gen_random_uuid(), v_org_id, v_proj_2, v_user_id, 'Before — Bare Lawn',          'https://images.pexels.com/photos/4505166/pexels-photo-4505166.jpeg?auto=compress&cs=tinysrgb&w=1600', 'active', 'uploaded', 'before'),
    (gen_random_uuid(), v_org_id, v_proj_2, v_user_id, 'After — Curb Appeal',         'https://images.pexels.com/photos/259588/pexels-photo-259588.jpeg?auto=compress&cs=tinysrgb&w=1600',   'active', 'uploaded', 'after'),
    (gen_random_uuid(), v_org_id, v_proj_2, v_user_id, 'New Mulch Beds',              'https://images.pexels.com/photos/1408221/pexels-photo-1408221.jpeg?auto=compress&cs=tinysrgb&w=1600', 'active', 'uploaded', 'after'),
    (gen_random_uuid(), v_org_id, v_proj_2, v_user_id, 'Tree Pruning Complete',       'https://images.pexels.com/photos/95209/pexels-photo-95209.jpeg?auto=compress&cs=tinysrgb&w=1600',    'active', 'uploaded', 'after'),
    (gen_random_uuid(), v_org_id, v_proj_2, v_user_id, 'Walkway Edging',              'https://images.pexels.com/photos/162539/pexels-photo-162539.jpeg?auto=compress&cs=tinysrgb&w=1600',  'active', 'uploaded', 'after');

  UPDATE public.organizations SET portfolio_published = true WHERE id = v_org_id;

  RAISE NOTICE 'Landscaper demo ready: https://mountainview-landscape.captureyourwork.com';
END $$;
