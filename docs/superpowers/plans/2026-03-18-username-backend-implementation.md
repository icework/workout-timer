# Username Backend Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add username-only login plus backend JSON persistence for workouts and sessions, with safe one-time migration from legacy Dexie data.

**Architecture:** Extend the existing Node server into a small JSON API with serialized writes and a dedicated import endpoint. Keep the current React/Zustand shape, add an auth layer and login screen, switch workout/session repositories to HTTP, and keep Dexie only for migration and profile preferences.

**Tech Stack:** Node HTTP server, React 19, TypeScript, Zustand, Vitest, Dexie

---

## File Structure

- Modify: `server.js`
  Purpose: serve SPA and route API requests.
- Create: `src/backend/storage.ts`
  Purpose: JSON file bootstrap, read/write helpers, write mutex, username normalization, import/upsert operations.
- Create: `src/backend/storage.test.ts`
  Purpose: backend persistence and migration policy tests.
- Create: `src/backend/contracts.ts`
  Purpose: shared API payload types and serialization helpers.
- Create: `src/auth/username.ts`
  Purpose: normalize and validate usernames in one place.
- Create: `src/auth/username.test.ts`
  Purpose: username normalization/validation tests.
- Create: `src/stores/authStore.ts`
  Purpose: frontend auth state persisted to localStorage.
- Create: `src/stores/authStore.test.ts`
  Purpose: auth store tests.
- Create: `src/pages/Login/index.tsx`
  Purpose: username-only login UI.
- Create: `src/pages/Login/index.test.tsx`
  Purpose: login page rendering/behavior tests.
- Create: `src/persistence/httpClient.ts`
  Purpose: shared fetch wrapper and JSON helpers.
- Modify: `src/persistence/workoutRepo.ts`
  Purpose: switch workout persistence from Dexie to HTTP.
- Modify: `src/persistence/sessionRepo.ts`
  Purpose: switch session persistence from Dexie to HTTP.
- Create: `src/persistence/serializers.ts`
  Purpose: convert API ISO strings to domain `Date` values and back.
- Create: `src/persistence/migration.ts`
  Purpose: legacy Dexie detection, sentinel handling, import flow.
- Create: `src/persistence/migration.test.ts`
  Purpose: migration safety tests.
- Modify: `src/persistence/db.ts`
  Purpose: keep only the Dexie tables still needed for migration/profile access and add a clear helper.
- Modify: `src/App.tsx`
  Purpose: gate app routes behind login and boot migration/loading flow.
- Modify: `src/main.tsx`
  Purpose: keep app bootstrap simple if provider/state setup is needed.
- Modify: `src/stores/workoutStore.ts`
  Purpose: ensure loading/saving uses authenticated backend repo cleanly.
- Modify: `src/stores/sessionStore.ts`
  Purpose: ensure loading/saving uses authenticated backend repo cleanly.

## Chunk 1: Backend JSON Storage And API

### Task 1: Username helpers and storage core

**Files:**
- Create: `src/auth/username.ts`
- Test: `src/auth/username.test.ts`
- Create: `src/backend/storage.ts`
- Test: `src/backend/storage.test.ts`

- [ ] **Step 1: Write the failing username tests**

```ts
it('normalizes usernames by trimming and lowercasing', () => {
  expect(normalizeUsername(' Alice ')).toBe('alice');
});

it('rejects empty usernames', () => {
  expect(() => normalizeUsername('   ')).toThrow('Username is required');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/auth/username.test.ts`
Expected: FAIL because `src/auth/username.ts` does not exist yet

- [ ] **Step 3: Write minimal username implementation**

```ts
export function normalizeUsername(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    throw new Error('Username is required');
  }
  return normalized;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/auth/username.test.ts`
Expected: PASS

- [ ] **Step 5: Write the failing storage tests**

```ts
it('creates a user bucket on login', async () => {
  const storage = createJsonStorage(tempFile);
  await storage.ensureUser('Alice');
  expect(await storage.read()).toMatchObject({
    users: { alice: { workouts: [], sessions: [] } },
  });
});

it('serializes writes to avoid lost updates', async () => {
  await Promise.all([
    storage.upsertWorkout('alice', workoutA),
    storage.upsertWorkout('alice', workoutB),
  ]);
  expect((await storage.getWorkouts('alice')).map((item) => item.id).sort()).toEqual(['a', 'b']);
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run src/backend/storage.test.ts`
Expected: FAIL because `src/backend/storage.ts` does not exist yet

- [ ] **Step 7: Write minimal storage implementation**

Implementation notes:
- bootstrap missing JSON file with `{ users: {} }`
- use atomic temp-file rename writes
- guard writes with a module-local promise queue
- normalize usernames on every public method

- [ ] **Step 8: Run test to verify it passes**

Run: `npx vitest run src/auth/username.test.ts src/backend/storage.test.ts`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add src/auth/username.ts src/auth/username.test.ts src/backend/storage.ts src/backend/storage.test.ts
git commit -m "feat: add username and backend storage helpers"
```

### Task 2: API contracts and server routes

**Files:**
- Create: `src/backend/contracts.ts`
- Modify: `server.js`
- Test: `src/backend/storage.test.ts`

- [ ] **Step 1: Write the failing API/storage policy tests**

```ts
it('returns only non-deleted workouts for a user', async () => {
  await storage.upsertWorkout('alice', { ...workout, isDeleted: true });
  expect(await storage.getWorkouts('alice')).toEqual([]);
});

it('rejects import when the target bucket already has data', async () => {
  await storage.upsertSession('alice', session);
  await expect(storage.importUserData('alice', { workouts: [workout], sessions: [] })).rejects.toThrow('IMPORT_CONFLICT');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/backend/storage.test.ts`
Expected: FAIL because the new policy is not implemented yet

- [ ] **Step 3: Implement storage policy and API routes**

Implementation notes:
- `GET /api/users/:username/workouts` returns `{ workouts }` with deleted workouts filtered out
- `GET /api/users/:username/sessions` returns `{ sessions }`
- `POST /api/login` creates bucket and returns normalized username
- `PUT` routes require `body.id === :id`
- `DELETE /api/users/:username/workouts/:id` soft-deletes
- `POST /api/users/:username/import` imports only when both collections are empty and returns `409` on conflict

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/backend/storage.test.ts`
Expected: PASS

- [ ] **Step 5: Smoke-test the server entry point**

Run: `npm test`
Expected: PASS with backend tests included in full suite

- [ ] **Step 6: Commit**

```bash
git add src/backend/contracts.ts src/backend/storage.ts src/backend/storage.test.ts server.js
git commit -m "feat: add backend workout api"
```

## Chunk 2: Frontend Login And Auth State

### Task 3: Auth store and login screen

**Files:**
- Create: `src/stores/authStore.ts`
- Test: `src/stores/authStore.test.ts`
- Create: `src/pages/Login/index.tsx`
- Test: `src/pages/Login/index.test.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Write the failing auth store tests**

```ts
it('stores the normalized username on login', async () => {
  await useAuthStore.getState().login(' Alice ');
  expect(useAuthStore.getState().username).toBe('alice');
});

it('clears auth state on logout', () => {
  useAuthStore.setState({ username: 'alice' });
  useAuthStore.getState().logout();
  expect(useAuthStore.getState().username).toBeNull();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/stores/authStore.test.ts`
Expected: FAIL because the auth store does not exist yet

- [ ] **Step 3: Implement minimal auth store**

Implementation notes:
- persist only normalized username to `localStorage`
- `login` calls `POST /api/login`
- expose `isAuthenticated`

- [ ] **Step 4: Run auth store test to verify it passes**

Run: `npx vitest run src/stores/authStore.test.ts`
Expected: PASS

- [ ] **Step 5: Write the failing login page tests**

```tsx
it('renders a username input and submit button', () => {
  const markup = renderToStaticMarkup(<LoginPage />);
  expect(markup).toContain('name="username"');
  expect(markup).toContain('Continue');
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run src/pages/Login/index.test.tsx`
Expected: FAIL because the page does not exist yet

- [ ] **Step 7: Implement minimal login page and route gate**

Implementation notes:
- when not authenticated, `App` renders login screen instead of main routes
- login page shows loading/error states from the auth store

- [ ] **Step 8: Run tests to verify they pass**

Run: `npx vitest run src/stores/authStore.test.ts src/pages/Login/index.test.tsx`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add src/stores/authStore.ts src/stores/authStore.test.ts src/pages/Login/index.tsx src/pages/Login/index.test.tsx src/App.tsx
git commit -m "feat: add username login flow"
```

## Chunk 3: HTTP Repositories, Migration, And App Boot

### Task 4: HTTP serialization and repository swap

**Files:**
- Create: `src/persistence/httpClient.ts`
- Create: `src/persistence/serializers.ts`
- Modify: `src/persistence/workoutRepo.ts`
- Modify: `src/persistence/sessionRepo.ts`
- Modify: `src/stores/workoutStore.ts`
- Modify: `src/stores/sessionStore.ts`

- [ ] **Step 1: Write the failing repository serialization tests**

```ts
it('deserializes workout dates from the api response', async () => {
  const workouts = await workoutRepo.getAll();
  expect(workouts[0].createdAt).toBeInstanceOf(Date);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/backend/storage.test.ts src/stores/authStore.test.ts`
Expected: FAIL or missing behavior because repos still use Dexie

- [ ] **Step 3: Implement HTTP client and repository swap**

Implementation notes:
- read current username from auth store
- throw a clear error if unauthenticated repo access occurs
- keep existing store method signatures unchanged

- [ ] **Step 4: Run relevant tests to verify they pass**

Run: `npx vitest run src/auth/username.test.ts src/stores/authStore.test.ts src/backend/storage.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/persistence/httpClient.ts src/persistence/serializers.ts src/persistence/workoutRepo.ts src/persistence/sessionRepo.ts src/stores/workoutStore.ts src/stores/sessionStore.ts
git commit -m "feat: move workout data to backend repos"
```

### Task 5: Legacy Dexie migration

**Files:**
- Modify: `src/persistence/db.ts`
- Create: `src/persistence/migration.ts`
- Test: `src/persistence/migration.test.ts`
- Modify: `src/App.tsx`

- [ ] **Step 1: Write the failing migration tests**

```ts
it('imports legacy dexie data only after ownership confirmation', async () => {
  const result = await migrateLegacyData({ confirmedOwner: 'alice' });
  expect(result.status).toBe('imported');
});

it('keeps legacy data when server import conflicts', async () => {
  mockImportConflict();
  const result = await migrateLegacyData({ confirmedOwner: 'alice' });
  expect(result.status).toBe('conflict');
  expect(await readLegacyWorkouts()).toHaveLength(1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/persistence/migration.test.ts`
Expected: FAIL because migration helpers do not exist yet

- [ ] **Step 3: Implement migration helper**

Implementation notes:
- detect legacy Dexie workouts/sessions
- store migration sentinel in `localStorage`
- clear sentinel after successful import cleanup
- preserve legacy Dexie data on failure or `409`
- expose reset capability for mistaken ownership claims

- [ ] **Step 4: Wire boot flow in `App.tsx`**

Implementation notes:
- after auth restore, run migration once
- load workouts and sessions after migration settles
- keep a loading shell while bootstrapping

- [ ] **Step 5: Run migration tests and full suite**

Run: `npx vitest run src/persistence/migration.test.ts`
Expected: PASS

Run: `npm test`
Expected: PASS

- [ ] **Step 6: Run build verification**

Run: `npm run build`
Expected: exit code 0

- [ ] **Step 7: Commit**

```bash
git add src/persistence/db.ts src/persistence/migration.ts src/persistence/migration.test.ts src/App.tsx
git commit -m "feat: migrate legacy workout data to backend"
```
