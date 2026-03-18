# Username Backend Design

中文摘要：
本文档定义了一个面向家庭使用场景的轻量后端方案。系统采用仅用户名登录，不引入密码、令牌或复杂鉴权。后端基于现有 Node 服务器扩展 JSON 文件存储，按用户名保存 workouts 与 workout sessions。前端继续沿用 React + Zustand 架构，但将 workouts 和 sessions 的持久化从本地 Dexie/IndexedDB 切换为 HTTP API。首次登录时，如浏览器中存在历史本地数据，系统会先要求用户确认该数据归属，再通过原子导入接口迁移到对应用户名的服务端存储；只有导入成功后才清除本地数据库；如果目标用户名在服务端已存在数据，则返回冲突并保留本地数据，避免误删。该设计优先追求实现简单、易部署、易维护，同时保留后续升级为更正式认证和数据库方案的空间。

## Document Status

- Status: Approved design
- Date: 2026-03-18
- Product: Workout Timer
- Type: Engineering Design Document

## 1. Goal

Add a minimal backend-backed identity and persistence flow for family use:

- Users sign in with a username only
- Workouts are stored on the server by username instead of Dexie/IndexedDB
- Workout sessions and stats data are also stored on the server by username
- Existing local browser data is migrated to the server on first login, then cleared locally

This change intentionally avoids passwords, tokens, cookies, multi-user collaboration, and offline sync complexity.

## 2. Recommended Approach

### Chosen Option

Keep the current React and Zustand architecture, extend the existing Node server into a tiny JSON API, and replace Dexie workout/session persistence with `fetch`-based repositories.

### Why This Option

- Smallest viable change from the current codebase
- Fits the family-use trust model
- Easy to deploy because it keeps a single Node process
- Avoids cache-sync and merge conflicts across devices

### Explicit Non-Goals

- Secure authentication suitable for public internet use
- Password reset, sessions, or access tokens
- Simultaneous multi-device conflict resolution
- General-purpose database abstraction
- Offline-first editing after migration

## 3. Architecture Overview

The existing `server.js` currently serves static files only. It will be expanded to handle two responsibilities:

1. Serve the built SPA
2. Expose a lightweight JSON API for per-user workouts and sessions

The frontend remains a SPA with Zustand stores. The store APIs stay mostly stable, but the underlying persistence repositories switch from local Dexie access to backend HTTP calls.

### High-Level Flow

1. User opens the app and sees a login screen if no username is active
2. User enters a username
3. Frontend calls `POST /api/login`
4. Backend normalizes the username and ensures that user storage exists in the JSON file
5. Frontend checks whether legacy Dexie data exists in this browser
6. If server data for the username is empty, frontend uploads local workouts and sessions to the server
7. After successful migration, frontend clears the local Dexie database
8. App loads workouts and sessions from the backend and continues normal operation

## 4. Data Storage Design

### Storage Medium

Use a single JSON file on the server filesystem. This keeps the system easy to inspect, back up, and run for a small trusted user group.

Deployment assumption:

- single Node process
- single shared JSON file
- in-process request serialization for all write operations

Atomic file writes are required but not sufficient on their own. The backend must also use a simple write mutex or queue so overlapping requests cannot clobber each other during read-modify-write cycles.

### Proposed File Shape

```json
{
  "users": {
    "alice": {
      "workouts": [],
      "sessions": []
    },
    "bob": {
      "workouts": [],
      "sessions": []
    }
  }
}
```

### User Bucket Structure

Each username maps to:

- `workouts`: all workout templates for that user
- `sessions`: all workout session history for that user

No cross-user sharing is included in this version.

### Serialization Rules

- Dates are serialized as ISO strings in the JSON file and over the API
- Frontend repositories convert incoming date strings back to `Date` instances before passing data into stores/domain code
- Existing domain models remain unchanged to minimize behavioral risk

## 5. Backend API Design

### Authentication Model

Authentication is intentionally lightweight:

- Username only
- No password
- No server-side session
- No cookie or bearer token
- Username is included in API paths after login

This is acceptable only because the product is explicitly family-only and low-risk.

### Username Rules

- Trim leading and trailing whitespace
- Convert to lowercase for storage consistency
- Reject empty usernames

### Endpoints

#### `POST /api/login`

Request:

```json
{
  "username": "Alice"
}
```

Response:

```json
{
  "username": "alice"
}
```

Behavior:

- Normalize username
- Reject invalid input with `400`
- Create a user bucket if missing
- Persist the updated JSON file

#### `GET /api/users/:username/workouts`

Response:

```json
{
  "workouts": []
}
```

Behavior:

- Normalize `:username` server-side before lookup
- Return only non-deleted workouts

#### `PUT /api/users/:username/workouts/:id`

Behavior:

- Normalize `:username` server-side before lookup
- Require `body.id` to match `:id`, otherwise return `400`
- Reject malformed workout payloads with `400`
- Upsert a full workout document
- Replace an existing workout with the same `id`
- Keep the frontend as the source of object shape and derived fields

#### `DELETE /api/users/:username/workouts/:id`

Behavior:

- Normalize `:username` server-side before lookup
- Preserve existing soft-delete semantics by marking the workout as `isDeleted: true`
- Do not affect any other username
- Session history remains untouched because sessions already snapshot workout title and totals

#### `GET /api/users/:username/sessions`

Response:

```json
{
  "sessions": []
}
```

#### `PUT /api/users/:username/sessions/:id`

Behavior:

- Normalize `:username` server-side before lookup
- Require `body.id` to match `:id`, otherwise return `400`
- Reject malformed session payloads with `400`
- Upsert a full session document
- Used for session creation and updates

#### Required Migration Endpoint

To keep migration safe and atomic, the first implementation should include a dedicated import endpoint:

- `POST /api/users/:username/import`

Payload:

```json
{
  "workouts": [],
  "sessions": []
}
```

Behavior:

- Normalize `:username` server-side before lookup
- Import both collections in one write transaction
- Succeed only when the target user bucket is fully empty for both workouts and sessions
- Return `409` if either collection already contains data
- Reject malformed workout/session payloads with `400`

## 6. Frontend Changes

### 6.1 Auth State

Add an auth store with:

- `username: string | null`
- `isAuthenticated: boolean`
- `login(username)`
- `logout()`

Persistence:

- Store only the normalized username in browser `localStorage`
- This is only for convenience so the user stays signed in on the same device
- No sensitive secret is stored because there is no password

### 6.2 Login UI

Add a simple login screen shown when no active username exists.

Requirements:

- One input for username
- One submit button
- Validation for empty input
- Loading and error states

The rest of the app remains inaccessible until login completes.

### 6.3 Persistence Repositories

Replace Dexie-backed persistence for workouts and sessions with HTTP-backed repositories:

- `workoutRepo`
- `sessionRepo`

Store contracts should remain stable so the Zustand layer does not need a structural rewrite.

### 6.4 Legacy Local Migration

Keep Dexie temporarily for migration-only access:

- Read old local workouts and sessions after successful login
- Check whether legacy browser data has already been claimed by a username on this device
- If legacy data is unclaimed, show a one-time confirmation before importing it into the logged-in username
- Store migration state in localStorage with:
  - claimed username
  - status: `pending`, `completed`, or `conflict`
- Use the dedicated import endpoint so workouts and sessions move together
- Only clear local Dexie data after successful import
- After successful import, delete the legacy Dexie data and remove the migration sentinel entirely
- If import returns `409`, leave local Dexie data untouched and treat migration as unresolved rather than silently discarding it
- Provide a local reset action that clears the sentinel only, so a mistaken ownership confirmation can be retried without deleting legacy Dexie data

### 6.5 App Boot Flow

Proposed boot sequence:

1. Restore username from `localStorage`
2. If missing, show login page
3. If present, allow app shell to initialize
4. Run migration guard once
5. Load workouts and sessions from backend repositories

## 7. Migration Rules

### Source of Truth

After login and migration, the backend becomes the source of truth for workouts and sessions.

### First Login Behavior

If the browser still contains legacy Dexie data:

- When legacy data is not yet claimed on this browser:
  - ask the user to confirm that the old local data belongs to the current username
  - store a local migration sentinel with the claimed username after confirmation
- When the target server bucket is fully empty:
  - import local workouts and sessions together through the migration endpoint
  - clear local Dexie data only after import succeeds
  - remove the migration sentinel after successful cleanup
- When the target server bucket already contains workouts or sessions:
  - return migration conflict instead of auto-merging or auto-clearing
  - leave local Dexie data untouched until the user resolves it manually
  - preserve the migration sentinel with `conflict` status so the app can explain why migration stopped

### Failure Handling

If migration upload fails:

- do not clear local Dexie data
- show an error so the user knows migration did not complete
- allow retry on the next login/app load
- keep the migration sentinel only after explicit user confirmation, not after a failed import
- allow the user to reset the sentinel locally if they claimed the wrong username

This protects against accidental data loss.

## 8. Error Handling

### Backend

- Create the storage file automatically if missing
- Use atomic file writes plus an in-process write mutex/queue
- Return `500` for malformed storage JSON rather than overwriting it silently
- Return `400` for invalid usernames
- Return `404` if the request targets a missing user bucket after normalization checks fail
- Return `409` when migration import is requested for a non-empty user bucket

### Frontend

- Show a clear error on failed login
- Show a clear error when workouts or sessions fail to load
- Block destructive migration cleanup until upload success is confirmed
- Logout clears the active username only; it never deletes server data

## 9. Testing Strategy

### Backend Tests

Add tests that verify:

- login creates a new username bucket
- usernames are trimmed and lowercased
- workouts are saved and loaded per username
- sessions are saved and loaded per username
- deleting a workout affects only the target username
- storage file bootstrap works when the file does not exist
- overlapping writes are serialized correctly
- import succeeds only when both workouts and sessions are empty
- import returns `409` when target user data already exists

### Frontend Tests

Add tests that verify:

- username validation and normalization
- auth store login/logout behavior
- migration requires explicit ownership confirmation before first import
- migration uploads local Dexie data when server is empty
- migration clears local Dexie only after successful upload
- migration preserves local Dexie data when server import returns `409`
- migration preserves Dexie data when upload fails

### Verification Before Completion

Before claiming implementation is complete:

- run targeted unit tests for new backend and migration logic
- run the full test suite
- run typecheck/build
- manually verify login, workout creation, session creation, reload persistence, and logout

## 10. Incremental Delivery Plan

1. Add backend storage utilities and API routing to `server.js`
2. Add backend tests around username and JSON storage behavior
3. Add frontend auth store and login screen
4. Swap workout/session repositories from Dexie to HTTP
5. Add migration helper from Dexie to backend
6. Run verification and fix edge cases

## 11. Risks And Trade-Offs

### Accepted Risks

- Anyone who knows a username can access that user’s data
- JSON file storage is not ideal for high write volume or concurrent edits
- No conflict handling for simultaneous edits from multiple devices
- Shared-device legacy migration still depends on the user confirming the correct owner

### Why They Are Acceptable Here

- The app is family-only and trust-based
- The user explicitly requested username-only login
- Simplicity is more valuable than production-grade security for this scope

### Clear Upgrade Path

If the product grows later, the design can evolve toward:

- password-based auth or magic-link auth
- cookie or token sessions
- SQLite or Postgres storage
- bulk APIs and stronger validation

## 12. Implementation Recommendation

Keep the current domain types and Zustand store interfaces intact wherever possible. The safest path is to change the persistence boundary, not the domain model. That keeps the behavior of workout editing, timer execution, and stats computation stable while moving ownership of data from the browser to the backend.
