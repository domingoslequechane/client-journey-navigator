

## Plan: Remove Free Plan Completely and Enforce Mandatory Payment

### Overview
Every new account will start with **no plan** (plan_type remains 'free' in the database but is treated as "no plan"). Users must select a paid plan (Lanca, Arco, or Catapulta) and provide card information before accessing the app. The 14-day free trial is configured on LemonSqueezy's side, not in our code.

### Changes Required

#### 1. SelectPlan page -- Remove "free" references
- **`src/pages/SelectPlan.tsx`** (line 114): Change `plan_type: 'free'` to `plan_type: 'free'` (keep as-is since it's the default DB value, but the user won't stay on free)
- Update button text from "Comecar Gratis" to "Assinar Agora" since card info is mandatory
- Remove "14 dias gratis" messaging if trials are not configured on LemonSqueezy, or keep if they are

#### 2. ProtectedRoute -- Redirect users without subscription to SelectPlan
- **`src/components/auth/ProtectedRoute.tsx`**: When a user has no active subscription (no subscription record or status is not active/trialing), redirect to `/select-plan` instead of `/app/upgrade`
- Remove the trial_ends_at grace period check that allows access without a subscription

#### 3. useSubscription -- Remove trial-based access
- **`src/hooks/useSubscription.ts`**: Update `hasAccess` to only be `true` when there's an active or trialing subscription (from LemonSqueezy webhook). Remove the local `trialDaysLeft` logic that grants access based on `organization.trial_ends_at` without an actual subscription record

#### 4. Upgrade page -- Remove free/Bussola references
- **`src/pages/Upgrade.tsx`** (line 69): Remove `free: { name: 'Essencial', codename: 'Bussola', ... }` entry
- Update `currentPlan` fallback from `'starter'` to handle the case where user has no plan
- Change messaging to indicate card information is required

#### 5. Webhook -- Remove free fallback
- **`supabase/functions/lemonsqueezy-webhook/index.ts`** (line 70): Change default return from `'free'` to `'starter'` in `getPlanTypeFromVariant`
- Remove `free: 200` from `PLAN_PRICES`

#### 6. Onboarding flow adjustment
- **`src/pages/Onboarding.tsx`**: After onboarding completes, check if user has an active subscription. If not, redirect to `/select-plan` instead of `/app`

#### 7. Minor cleanup
- **`src/components/subscription/FreePlanBanner.tsx`**: Remove 'free' from planNames or rename to 'Sem Plano'
- **`src/hooks/usePlanLimits.ts`**: Ensure `free` plan type returns zero/no access for all modules
- **`src/components/subscription/PlanUsageCard.tsx`**: Update 'free' label from 'Legado' to 'Sem Plano'
- **`src/components/subscription/PlanBadge.tsx`**: Update free label

### Technical Details

**Flow for new users:**
1. Sign up and verify email
2. Redirected to `/select-plan`
3. Choose a plan (Lanca/Arco/Catapulta) -- card info is mandatory on LemonSqueezy
4. LemonSqueezy webhook creates subscription record
5. Redirected to `/app/onboarding` to configure agency name
6. Access granted to `/app`

**Flow for existing users without subscription:**
1. Login
2. ProtectedRoute detects no active subscription
3. Redirect to `/select-plan` or `/app/upgrade`

**Key principle:** Access is gated by `subscription.status` being `active` or `trialing` (set by LemonSqueezy webhook). No more local trial logic based on `organization.trial_ends_at`.

### Files to modify:
- `src/components/auth/ProtectedRoute.tsx`
- `src/hooks/useSubscription.ts`
- `src/pages/SelectPlan.tsx`
- `src/pages/Upgrade.tsx`
- `src/pages/Onboarding.tsx`
- `supabase/functions/lemonsqueezy-webhook/index.ts`
- `src/components/subscription/FreePlanBanner.tsx`
- `src/components/subscription/PlanUsageCard.tsx`
- `src/components/subscription/PlanBadge.tsx`

