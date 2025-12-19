-- Fix Agency plan to have unlimited team members
UPDATE plan_limits 
SET max_team_members = NULL 
WHERE plan_type = 'agency';