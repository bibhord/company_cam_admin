-- =====================================================================
-- Plumber Demo Setup
-- =====================================================================
-- PREREQUISITE: demo-plumber@captureyourwork.com must exist.
-- Run ensure-all-schema.sql first.
--
-- Idempotent — safe to re-run.
-- =====================================================================

DO $$
DECLARE
  v_user_id uuid;
  v_org_id  uuid;
  v_cat_service uuid;
  v_cat_install uuid;
  v_cat_emergency uuid;
  v_proj_1 uuid;
  v_proj_2 uuid;
BEGIN
  SELECT au.id, p.org_id INTO v_user_id, v_org_id
  FROM auth.users au
  JOIN public.profiles p ON p.user_id = au.id
  WHERE au.email = 'demo-plumber@captureyourwork.com'
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Account demo-plumber@captureyourwork.com not found.';
  END IF;

  UPDATE public.organizations
  SET name              = 'Wasatch Plumbing Co.',
      portfolio_slug    = 'wasatch-plumbing',
      portfolio_published = false,
      status            = 'active'
  WHERE id = v_org_id;

  INSERT INTO public.service_categories (org_id, name, sort_order) VALUES (v_org_id, 'Service & Repair', 1) ON CONFLICT DO NOTHING;
  SELECT id INTO v_cat_service FROM public.service_categories WHERE org_id = v_org_id AND name = 'Service & Repair';

  INSERT INTO public.service_categories (org_id, name, sort_order) VALUES (v_org_id, 'Installation', 2) ON CONFLICT DO NOTHING;
  SELECT id INTO v_cat_install FROM public.service_categories WHERE org_id = v_org_id AND name = 'Installation';

  INSERT INTO public.service_categories (org_id, name, sort_order) VALUES (v_org_id, 'Emergency', 3) ON CONFLICT DO NOTHING;
  SELECT id INTO v_cat_emergency FROM public.service_categories WHERE org_id = v_org_id AND name = 'Emergency';

  DELETE FROM public.services WHERE org_id = v_org_id;
  INSERT INTO public.services (org_id, category_id, name, description, duration_min, price_cents, price_type, is_active, sort_order) VALUES
    (v_org_id, v_cat_service,   'Service Call — Diagnostic',  'Onsite diagnosis. Fee credited toward repair if you proceed.',       30,  9500,   'fixed', true, 1),
    (v_org_id, v_cat_service,   'Drain Cleaning',             'Single drain, snake + camera if needed.',                            60,  17500,  'fixed', true, 2),
    (v_org_id, v_cat_service,   'Leak Detection',             'Acoustic and thermal leak detection. Includes written report.',      90,  17500,  'fixed', true, 3),
    (v_org_id, v_cat_service,   'Faucet Repair / Replace',    'Per fixture. Most kitchen and bath faucets.',                        60,  19900,  'from',  true, 4),
    (v_org_id, v_cat_install,   'Water Heater — 50gal Gas',   'Standard tank water heater replacement. Includes haul-away.',        180, 149500, 'fixed', true, 1),
    (v_org_id, v_cat_install,   'Water Heater — Tankless',    'Tankless install. Most homes; quote on site for complex layouts.',   240, 295000, 'from',  true, 2),
    (v_org_id, v_cat_install,   'Toilet Installation',        'Includes wax ring, supply line, and disposal of old unit.',          90,  37500,  'fixed', true, 3),
    (v_org_id, v_cat_install,   'Garbage Disposal',           'Per unit. Standard 1/2 or 3/4 HP. Customer supplies disposal or +$.',60,  24900,  'fixed', true, 4),
    (v_org_id, v_cat_install,   'Whole-House Repipe',         'Quote on site. PEX or copper.',                                      0,   0,      'from',  true, 5),
    (v_org_id, v_cat_emergency, 'Emergency Service',          'After-hours and weekends. Trip charge + hourly. 1-hour minimum.',    60,  15000,  'from',  true, 1);

  -- Mon-Fri full day, Sat half day, 24/7 emergency line implied by category above
  DELETE FROM public.business_hours WHERE org_id = v_org_id;
  INSERT INTO public.business_hours (org_id, day_of_week, open_time, close_time, is_closed) VALUES
    (v_org_id, 0, '09:00:00', '17:00:00', true),
    (v_org_id, 1, '08:00:00', '18:00:00', false),
    (v_org_id, 2, '08:00:00', '18:00:00', false),
    (v_org_id, 3, '08:00:00', '18:00:00', false),
    (v_org_id, 4, '08:00:00', '18:00:00', false),
    (v_org_id, 5, '08:00:00', '18:00:00', false),
    (v_org_id, 6, '09:00:00', '13:00:00', false);

  v_proj_1 := uuid_generate_v5('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', v_org_id::text || ':project:sandy-bathroom');
  v_proj_2 := uuid_generate_v5('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', v_org_id::text || ':project:holladay-kitchen');

  INSERT INTO public.projects (id, org_id, created_by, name, street_address, city, state_zip, status, featured) VALUES
    (v_proj_1, v_org_id, v_user_id, 'Sandy — Master Bathroom Repipe',  '9412 Wasatch Boulevard', 'Sandy',    'UT 84092', 'completed', true),
    (v_proj_2, v_org_id, v_user_id, 'Holladay — Kitchen Refit',         '2188 E Murray Holladay', 'Holladay', 'UT 84117', 'completed', true)
  ON CONFLICT (id) DO UPDATE
    SET status = EXCLUDED.status, featured = EXCLUDED.featured;

  DELETE FROM public.photos WHERE project_id IN (v_proj_1, v_proj_2);

  INSERT INTO public.photos (id, org_id, project_id, created_by, name, url, status, upload_status, bucket) VALUES
    -- Sandy bathroom
    (gen_random_uuid(), v_org_id, v_proj_1, v_user_id, 'Before — Old Plumbing',      'https://images.pexels.com/photos/834892/pexels-photo-834892.jpeg?auto=compress&cs=tinysrgb&w=1600',  'active', 'uploaded', 'before'),
    (gen_random_uuid(), v_org_id, v_proj_1, v_user_id, 'After — New PEX Repipe',     'https://images.pexels.com/photos/1909791/pexels-photo-1909791.jpeg?auto=compress&cs=tinysrgb&w=1600', 'active', 'uploaded', 'after'),
    (gen_random_uuid(), v_org_id, v_proj_1, v_user_id, 'Vanity + Faucets',           'https://images.pexels.com/photos/1571468/pexels-photo-1571468.jpeg?auto=compress&cs=tinysrgb&w=1600', 'active', 'uploaded', 'after'),
    (gen_random_uuid(), v_org_id, v_proj_1, v_user_id, 'Shower Valves',              'https://images.pexels.com/photos/1909791/pexels-photo-1909791.jpeg?auto=compress&cs=tinysrgb&w=1600', 'active', 'uploaded', 'after'),
    (gen_random_uuid(), v_org_id, v_proj_1, v_user_id, 'Tank Replacement',           'https://images.pexels.com/photos/4108715/pexels-photo-4108715.jpeg?auto=compress&cs=tinysrgb&w=1600', 'active', 'uploaded', 'after'),
    -- Holladay kitchen
    (gen_random_uuid(), v_org_id, v_proj_2, v_user_id, 'Before — Old Sink Plumbing', 'https://images.pexels.com/photos/834892/pexels-photo-834892.jpeg?auto=compress&cs=tinysrgb&w=1600',  'active', 'uploaded', 'before'),
    (gen_random_uuid(), v_org_id, v_proj_2, v_user_id, 'After — New Disposal',       'https://images.pexels.com/photos/1080721/pexels-photo-1080721.jpeg?auto=compress&cs=tinysrgb&w=1600', 'active', 'uploaded', 'after'),
    (gen_random_uuid(), v_org_id, v_proj_2, v_user_id, 'Kitchen Faucet Install',     'https://images.pexels.com/photos/1599791/pexels-photo-1599791.jpeg?auto=compress&cs=tinysrgb&w=1600', 'active', 'uploaded', 'after'),
    (gen_random_uuid(), v_org_id, v_proj_2, v_user_id, 'Dishwasher Connection',      'https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg?auto=compress&cs=tinysrgb&w=1600',  'active', 'uploaded', 'after'),
    (gen_random_uuid(), v_org_id, v_proj_2, v_user_id, 'Tankless Water Heater',      'https://images.pexels.com/photos/4108715/pexels-photo-4108715.jpeg?auto=compress&cs=tinysrgb&w=1600', 'active', 'uploaded', 'after');

  UPDATE public.organizations SET portfolio_published = true WHERE id = v_org_id;

  RAISE NOTICE 'Plumber demo ready: https://wasatch-plumbing.captureyourwork.com';
END $$;
