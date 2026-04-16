# Simple Modular Refactor Plan

Goal: keep the project simple, but stop mixing Supabase client setup, auth state, permissions, and feature-specific queries inside the same files.

## 1. Target file structure

```text
lib/
  supabase-client.js
  auth-state.js
  permissions.js

data/
  progress-api.js
  sessions-api.js
  comments-api.js
  notices-api.js
  members-api.js

pages/
  app.js
  session-editor.js
  session-page.js
  sessions-board.js
  member-board.js
  notice-board.js
  notice-post.js
```

## 2. What each module should own

### lib/supabase-client.js
- Create the Supabase client only.
- No permission logic.
- No DOM access.

### lib/auth-state.js
- `signIn()`
- `signOut()`
- `refreshAuthState()`
- `subscribeAuthState()`
- current session / current user accessors

This file should know auth, but not feature permissions.

### lib/permissions.js
- `fetchMyPermissions()` via `rpc("get_my_permissions")`
- normalize to:
  - `isAdmin`
  - `canComment`
  - `canManageMemberCard`
  - `canManageNotices`
- set body datasets if needed

This file should know permissions, but not data mutations.

### data/progress-api.js
- `fetchSectionProgressMap()`
- `saveSectionProgress()`

### data/sessions-api.js
- `fetchSessionNotes()`
- `saveSessionNotes()`
- `fetchSessionNoteList()`
- `createSessionNote()`

### data/comments-api.js
- `fetchSessionBlockComments()`
- `createSessionBlockComment()`
- `updateSessionBlockComment()`
- `deleteSessionBlockComment()`
- `deleteSessionBlockCommentsByBlockIds()`

### data/notices-api.js
- `fetchNotices()`
- `fetchNoticeById()`
- `saveNotice()`
- `deleteNotice()`

### data/members-api.js
- `fetchMembers()`
- `saveMember()`
- `deleteMember()`

## 3. Current-to-target map

### Current
- `supabase-auth.js`
  - client creation
  - auth session
  - permission fetch
  - body dataset sync
  - login panel DOM

- `supabase-data.js`
  - all feature queries mixed together
  - inline permission guards

### Target
- split `supabase-auth.js` into:
  - `lib/supabase-client.js`
  - `lib/auth-state.js`
  - `lib/permissions.js`

- split `supabase-data.js` into:
  - `data/progress-api.js`
  - `data/sessions-api.js`
  - `data/comments-api.js`
  - `data/notices-api.js`
  - `data/members-api.js`

## 4. Lowest-risk rollout order

### Step A. Add new files without changing page scripts
- create `lib/supabase-client.js`
- create `lib/auth-state.js`
- create `lib/permissions.js`
- keep `supabase-auth.js` temporarily as a thin wrapper

At this stage, old imports still work.

### Step B. Split data layer
- create all `data/*-api.js`
- keep `supabase-data.js` as a temporary re-export facade

This keeps runtime stable while reducing blast radius.

### Step C. Move page scripts one by one
Recommended order:
1. `notice-post.js`
2. `sessions-board.js`
3. `member-board.js`
4. `notice-board.js`
5. `app.js`
6. `session-editor.js`

That order moves low-risk pages first and the session editor last.

### Step D. Delete facades
After all imports are updated:
- delete old `supabase-auth.js`
- delete old `supabase-data.js`

## 5. Permission loading target

Current frontend problem:
- it reads explicit columns from `user_permissions`
- adding one new column can break permission loading

Target:
- one call only:

```js
const permissions = await supabase.rpc("get_my_permissions")
```

The browser should not care whether permissions are stored as booleans, roles, or future fields.

## 6. Ownership target

### session_block_comments
- use `author_user_id` for permission checks
- keep `author_email` only for display / legacy backfill

### member_cards
- use `owner_user_id` for permission checks
- keep `owner_email` only for display / legacy backfill

## 7. Practical end state

The final mental model should be:

```text
Supabase client
  -> auth state
    -> permissions
      -> feature data modules
        -> page UI
```

This is much simpler than:

```text
page UI
  -> mixed auth + mixed permissions + mixed DB calls
```

## 8. What not to do

- Do not jump straight to full RBAC tables if the project wants simplicity.
- Do not keep both email-based and user-id-based ownership forever.
- Do not let page scripts call raw permission SQL tables directly long-term.

## 9. Recommended next implementation task

If we actually start this migration, the first concrete coding task should be:

1. add `profiles` migration in Supabase
2. add `get_my_permissions()` RPC
3. make frontend permission loading use `profiles/get_my_permissions`
4. leave old tables in place temporarily

That gives the biggest stability gain for the smallest code change.

