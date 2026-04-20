-- Migration: auto_expire_subscriptions_daily
-- Applied: 2026-04-20
-- Purpose: Automatically expire subscriptions daily at 00:05 UTC

-- 1. Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Grant usage on cron schema
GRANT USAGE ON SCHEMA cron TO postgres;

-- 3. Create the function that expires overdue subscriptions
CREATE OR REPLACE FUNCTION expire_subscriptions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  expired_count INT;
BEGIN
  -- Expire subscriptions whose current_period_end has passed
  UPDATE subscriptions
  SET status     = 'expired',
      updated_at = NOW()
  WHERE status IN ('active', 'trialing')
    AND current_period_end IS NOT NULL
    AND current_period_end < NOW();

  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RAISE LOG '[expire_subscriptions] % subscription(s) expired via current_period_end.', expired_count;

  -- Expire subscriptions linked to organisations whose trial_ends_at has passed
  UPDATE subscriptions
  SET status     = 'expired',
      updated_at = NOW()
  WHERE id IN (
    SELECT s.id
    FROM subscriptions s
    JOIN organizations o ON s.organization_id = o.id
    WHERE s.status IN ('active', 'trialing')
      AND o.trial_ends_at IS NOT NULL
      AND o.trial_ends_at < NOW()
      AND (s.current_period_end IS NULL OR s.current_period_end < NOW())
  );

  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RAISE LOG '[expire_subscriptions] % subscription(s) expired via trial_ends_at.', expired_count;
END;
$$;

-- 4. Remove any pre-existing job with the same name
SELECT cron.unschedule('daily-expire-subscriptions')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'daily-expire-subscriptions'
);

-- 5. Schedule: every day at 00:05 UTC
SELECT cron.schedule(
  'daily-expire-subscriptions',
  '5 0 * * *',
  'SELECT expire_subscriptions()'
);
