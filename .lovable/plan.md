

## Plan

This plan addresses 7 distinct issues the user raised.

### 1. Block editing/re-publishing of published posts (`PostModal.tsx`, `SocialMedia.tsx`)
- In `PostModal`, accept a `isPublished` prop. When true, disable all form fields (content, hashtags, media, platforms) and hide the Save/Schedule/Publish buttons. Show only a "Duplicar para edição" button.
- In `SocialMedia.tsx`, pass `isPublished` based on `editingPost?.status === 'published'` to PostModal.
- In `PostCard.tsx`, the edit button already hides for published posts — keep that. Ensure clicking a published post card opens it in read-only mode.

### 2. Fix channel selection: select by account ID, not platform (`PostModal.tsx`)
- The current `togglePlatform` toggles by platform string, so two Instagram accounts both toggle together.
- Refactor channel selection to use `account.id` instead of `platform` name. Store `selectedAccountIds: string[]` instead of `platforms: SocialPlatform[]`.
- Derive `platforms` from the selected account IDs for downstream use (scheduling, preview, content types).
- Each account button toggles independently by its unique `id`.

### 3. Replace format dropdown with icons in schedule slots (`PostModal.tsx`)
- Replace the `<select>` dropdown for content type in each schedule slot with icon buttons using `ContentTypeIcon`.
- Each content type shows its icon, and clicking it selects that format for the slot.

### 4. Default schedule time = now + 15 minutes (`PostModal.tsx`)
- Replace hardcoded `'10:00'` default time with a computed value of current time + 15 minutes using `format(addMinutes(new Date(), 15), 'HH:mm')`.

### 5. Delete all records when disconnecting an account (`useSocialAccounts.ts`)
- In `deleteAccount` mutation, before deleting the `social_accounts` row, also delete related `social_posts` rows that reference this account's platform + client_id (or handle via cascade). Since posts reference platforms as an array, we'll delete posts where the account's platform is the *only* platform. For posts with multiple platforms, remove the platform from the array.
- Actually, simpler: just delete the `social_accounts` record. The user wants all records of that account removed. We should also clean up any posts that only target that specific account.

### 6. Import full account info on connect/sync (`social-sync-accounts` edge function)
- Already imports `displayName`, `username`, `avatarUrl`, `followers`. Verify the Late.dev API response fields and ensure `bio`, `profileUrl` etc. are also captured if available. The current schema covers the key fields — ensure `account_name`, `username`, `avatar_url`, `followers_count` are always populated from the API response.

### 7. Hide "Late.dev" references from frontend
- Remove `Late.dev` badge from `PostCard.tsx` (line 48).
- Remove `Late.dev ID` badge from `AccountManagementModal.tsx` (lines 91-94).
- Remove `hasLateAccounts` variable usage in `PostModal.tsx` — always show Publish button if connected accounts exist.

### Files to modify
| File | Changes |
|------|---------|
| `src/components/social-media/PostModal.tsx` | Account-based selection, icon format selector, default time +15min, hide Late.dev refs, read-only for published |
| `src/components/social-media/PostCard.tsx` | Remove Late.dev badge |
| `src/components/social-media/AccountManagementModal.tsx` | Remove Late.dev ID badge |
| `src/pages/SocialMedia.tsx` | Pass published state to PostModal |
| `src/hooks/useSocialAccounts.ts` | Clean up related posts on disconnect |

