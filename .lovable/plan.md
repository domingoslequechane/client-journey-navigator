

## Plan: Fix Social Media Connection Architecture (Per-Client Late.dev Profiles)

### Problem
There are two issues:

1. **Accounts don't appear as connected**: When you connect Instagram/Facebook via Late.dev, the synced accounts are saved with `client_id: null` because the sync function doesn't know which client the accounts belong to. When the dashboard filters by `client_id`, they don't show up.

2. **Late.dev profile uses the agency name**: The current code creates one Late.dev profile per organization using the agency name (e.g., "Onix Agence"). Instead, each **client** (e.g., FERRANOVA, Dream House) should have its own Late.dev profile.

### Solution

Change the architecture so that each **client** gets its own Late.dev profile. When connecting a platform for a specific client, the system creates/uses a Late.dev profile named after that client.

### Database Changes

1. **Add `late_profile_id` column to `clients` table**
   - New nullable text column on the `clients` table to store each client's Late.dev profile ID
   - The existing `late_profile_id` on `organizations` will remain for backwards compatibility but won't be the primary source

### Backend Changes

2. **Update `social-connect` Edge Function**
   - Accept `client_id` parameter from the frontend
   - Look up the client's name and their `late_profile_id`
   - If the client doesn't have a Late.dev profile yet, create one using the **client's name** (e.g., "FERRANOVA")
   - Save the `late_profile_id` on the **clients** table, not the organizations table
   - Use the client's profile ID when generating the OAuth connect URL

3. **Update `social-sync-accounts` Edge Function**
   - Accept optional `client_id` parameter
   - If `client_id` is provided, sync only that client's Late.dev profile and set `client_id` on all synced accounts
   - If no `client_id`, iterate over all clients with a `late_profile_id` and sync each one, setting the correct `client_id` on their accounts

4. **Update `social-fetch-messages` and `social-reply-message` Edge Functions**
   - Instead of reading `late_profile_id` from the organization, read it from the client's record (based on a `client_id` parameter)

### Frontend Changes

5. **Update `useSocialAccounts.ts`**
   - Pass `clientId` to the `social-connect` function so the backend knows which client is being connected
   - Pass `clientId` to the `social-sync-accounts` function so it syncs the correct client's profiles

6. **Update `SocialDashboard.tsx` and `SocialMedia.tsx`**
   - Pass the selected `clientId` when calling `connectPlatform` and `syncAccounts`
   - The "Sincronizar" button will sync accounts for the selected client only

### Flow After Changes

```text
Agency "Onix" selects client "FERRANOVA" in the Social Media module
  --> Clicks "Conectar" on Instagram
  --> Backend checks if FERRANOVA has a late_profile_id
      --> If not, creates Late.dev profile named "FERRANOVA"
      --> Saves late_profile_id on clients table
  --> Opens OAuth popup for that profile
  --> On popup close, syncs accounts for FERRANOVA's profile
  --> Synced accounts are saved with client_id = FERRANOVA's ID
  --> Dashboard shows Instagram as connected for FERRANOVA
```

### Files to Modify

| File | Change |
|------|--------|
| **Database migration** | Add `late_profile_id TEXT` column to `clients` table |
| `supabase/functions/social-connect/index.ts` | Accept `client_id`, create/use per-client Late.dev profiles |
| `supabase/functions/social-sync-accounts/index.ts` | Accept `client_id`, set `client_id` on synced accounts |
| `supabase/functions/social-fetch-messages/index.ts` | Read `late_profile_id` from client instead of organization |
| `supabase/functions/social-reply-message/index.ts` | Read `late_profile_id` from client instead of organization |
| `src/hooks/useSocialAccounts.ts` | Pass `clientId` to connect and sync functions |
| `src/components/social-media/SocialDashboard.tsx` | Pass `clientId` when connecting platforms |
| `src/pages/SocialMedia.tsx` | Pass `clientId` to sync and connect calls |
