-- =====================================================================
-- setup-realestate-demo-photos.sql
-- =====================================================================
-- Populates the two demo projects with real-estate photos from Pexels.
-- These are free, royalty-free images served from images.pexels.com.
-- The next.config.ts allows that domain for next/image.
--
-- Run AFTER setup-realestate-demo.sql.
-- Idempotent — safe to re-run (deletes existing demo photos first).
-- =====================================================================

DO $$
DECLARE
  v_user_id uuid;
  v_org_id  uuid;
  v_proj_1  uuid;
  v_proj_2  uuid;
BEGIN
  SELECT au.id, p.org_id
    INTO v_user_id, v_org_id
  FROM auth.users au
  JOIN public.profiles p ON p.user_id = au.id
  WHERE au.email = 'realestate-demo@captureyourwork.com'
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'realestate-demo account not found. Run setup-realestate-demo.sql first.';
  END IF;

  v_proj_1 := uuid_generate_v5('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', v_org_id::text || ':project:hillside-modern');
  v_proj_2 := uuid_generate_v5('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', v_org_id::text || ':project:downtown-loft');

  -- Wipe existing demo photos so re-runs reset cleanly
  DELETE FROM public.photos WHERE project_id IN (v_proj_1, v_proj_2);

  -- Project 1: "4218 Hillside Drive — Modern Family Home"
  INSERT INTO public.photos (id, org_id, project_id, created_by, name, url, status, upload_status, bucket) VALUES
    (gen_random_uuid(), v_org_id, v_proj_1, v_user_id, 'Exterior — Front',     'https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg?auto=compress&cs=tinysrgb&w=1600', 'active', 'uploaded', 'after'),
    (gen_random_uuid(), v_org_id, v_proj_1, v_user_id, 'Living Room',          'https://images.pexels.com/photos/1457842/pexels-photo-1457842.jpeg?auto=compress&cs=tinysrgb&w=1600', 'active', 'uploaded', 'after'),
    (gen_random_uuid(), v_org_id, v_proj_1, v_user_id, 'Kitchen',              'https://images.pexels.com/photos/1080721/pexels-photo-1080721.jpeg?auto=compress&cs=tinysrgb&w=1600', 'active', 'uploaded', 'after'),
    (gen_random_uuid(), v_org_id, v_proj_1, v_user_id, 'Master Bedroom',       'https://images.pexels.com/photos/271743/pexels-photo-271743.jpeg?auto=compress&cs=tinysrgb&w=1600',  'active', 'uploaded', 'after'),
    (gen_random_uuid(), v_org_id, v_proj_1, v_user_id, 'Bathroom',             'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=1600', 'active', 'uploaded', 'after'),
    (gen_random_uuid(), v_org_id, v_proj_1, v_user_id, 'Backyard',             'https://images.pexels.com/photos/259588/pexels-photo-259588.jpeg?auto=compress&cs=tinysrgb&w=1600',  'active', 'uploaded', 'after');

  -- Project 2: "120 W South Temple — Downtown Loft"
  INSERT INTO public.photos (id, org_id, project_id, created_by, name, url, status, upload_status, bucket) VALUES
    (gen_random_uuid(), v_org_id, v_proj_2, v_user_id, 'Loft — Wide Angle',    'https://images.pexels.com/photos/1571468/pexels-photo-1571468.jpeg?auto=compress&cs=tinysrgb&w=1600', 'active', 'uploaded', 'after'),
    (gen_random_uuid(), v_org_id, v_proj_2, v_user_id, 'Kitchen Island',       'https://images.pexels.com/photos/1599791/pexels-photo-1599791.jpeg?auto=compress&cs=tinysrgb&w=1600', 'active', 'uploaded', 'after'),
    (gen_random_uuid(), v_org_id, v_proj_2, v_user_id, 'Bedroom',              'https://images.pexels.com/photos/1454806/pexels-photo-1454806.jpeg?auto=compress&cs=tinysrgb&w=1600', 'active', 'uploaded', 'after'),
    (gen_random_uuid(), v_org_id, v_proj_2, v_user_id, 'Bathroom — Marble',    'https://images.pexels.com/photos/1909791/pexels-photo-1909791.jpeg?auto=compress&cs=tinysrgb&w=1600', 'active', 'uploaded', 'after'),
    (gen_random_uuid(), v_org_id, v_proj_2, v_user_id, 'City View',            'https://images.pexels.com/photos/2476632/pexels-photo-2476632.jpeg?auto=compress&cs=tinysrgb&w=1600', 'active', 'uploaded', 'after'),
    (gen_random_uuid(), v_org_id, v_proj_2, v_user_id, 'Entryway',             'https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?auto=compress&cs=tinysrgb&w=1600',  'active', 'uploaded', 'after');

  -- Now that both projects have photos, publish the portfolio
  UPDATE public.organizations
  SET portfolio_published = true
  WHERE id = v_org_id;

  RAISE NOTICE 'Demo photos inserted and portfolio published. Visit: https://tonytownsend-demo.captureyourwork.com';
END $$;
