-- Migration to create organizations and subscriptions for existing users without them

-- Create organizations for existing admin users who don't have one
DO $$
DECLARE
  user_record RECORD;
  new_org_id uuid;
  org_slug text;
  trial_end timestamp with time zone;
BEGIN
  -- Find admin users without organization_id
  FOR user_record IN 
    SELECT p.id, p.full_name, p.email 
    FROM public.profiles p 
    WHERE p.role = 'admin' 
    AND p.organization_id IS NULL
  LOOP
    -- Generate slug from user name or email
    org_slug := lower(regexp_replace(COALESCE(user_record.full_name, split_part(user_record.email, '@', 1)), '[^a-zA-Z0-9]+', '-', 'g'));
    org_slug := trim(both '-' from org_slug);
    
    -- Ensure uniqueness
    WHILE EXISTS (SELECT 1 FROM public.organizations WHERE slug = org_slug) LOOP
      org_slug := org_slug || '-' || floor(random() * 1000)::int;
    END LOOP;
    
    -- Set trial end to 14 days from now
    trial_end := now() + interval '14 days';
    
    -- Create the organization
    INSERT INTO public.organizations (name, slug, owner_id, trial_ends_at)
    VALUES (
      COALESCE(user_record.full_name, 'My Agency') || '''s Agency',
      org_slug,
      user_record.id,
      trial_end
    )
    RETURNING id INTO new_org_id;
    
    -- Update user profile with organization_id
    UPDATE public.profiles 
    SET organization_id = new_org_id 
    WHERE id = user_record.id;
    
    -- Create trialing subscription
    INSERT INTO public.subscriptions (organization_id, status, current_period_start, current_period_end)
    VALUES (new_org_id, 'trialing', now(), trial_end);
    
    RAISE NOTICE 'Created organization % for user %', new_org_id, user_record.id;
  END LOOP;
END $$;