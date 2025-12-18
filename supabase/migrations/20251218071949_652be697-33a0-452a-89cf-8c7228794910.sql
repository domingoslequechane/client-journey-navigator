-- Fix the invited user's profile with the correct organization_id
UPDATE profiles 
SET organization_id = 'fe52e6cc-cb62-4ca9-b02e-cb25a4a26455' 
WHERE id = '53689bbf-94a8-44ea-bc44-745c60b2e055' 
AND organization_id IS NULL;