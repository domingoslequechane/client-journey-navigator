

## Analysis

I identified two distinct problems:

### Problem 1: Posts cannot be scheduled (missing `client_id`)
When creating a post, `SocialMedia.tsx` `handleSave` never passes the `selectedClient` as `client_id` to `createPost`. The post is saved without a `client_id`, which means:
- It won't appear when filtering by client
- The `social-publish` edge function may fail because connected accounts are per-client

**Root cause**: `handleSave` in `SocialMedia.tsx` (line 93-121) doesn't inject `client_id: selectedClient` into the data before calling `createPost.mutate()`.

### Problem 2: Reels and Stories scheduling
Reels and Stories are **already supported** in the UI. The `PLATFORM_CONTENT_TYPES` map (PostModal lines 22-31) includes `reels` and `stories` for Instagram and Facebook. Each schedule slot has a format selector dropdown. However, the `buildPostData` function only uses the first slot's content type and ignores per-slot content types when creating individual posts for multiple slots. So if you add multiple slots with different formats, only one post is created with the first slot's data.

## Plan

### 1. Fix `client_id` injection in `handleSave` (`src/pages/SocialMedia.tsx`)
- In `handleSave`, add `client_id: selectedClient !== 'all' ? selectedClient : null` to the data object before passing it to `createPost.mutate()` or `updatePost.mutate()`

### 2. Support multiple schedule slots creating multiple posts (`src/pages/SocialMedia.tsx`)
- When `schedule_slots` is present in the saved data (multiple slots), create one post per slot with its own `scheduled_at`, `platforms`, and `content_type`
- Each slot post gets the same content, media, and hashtags but its own schedule and format

### 3. Ensure `PostModal` propagates per-slot `content_type` correctly (`src/components/social-media/PostModal.tsx`)
- Update `buildPostData` to include `schedule_slots` data with per-slot `contentType` so the parent can create separate posts per slot

### Files to modify
| File | Change |
|------|--------|
| `src/pages/SocialMedia.tsx` | Inject `client_id` into post data; handle multi-slot creation |
| `src/components/social-media/PostModal.tsx` | Ensure per-slot content_type is included in output data |

