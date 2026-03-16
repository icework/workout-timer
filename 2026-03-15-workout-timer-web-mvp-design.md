# Workout Timer Web MVP Design

中文摘要:
这份产品规格定义了一个以 Web 为优先、移动端可用的 `Workout Timer` MVP。产品核心是一个 `builder-first` 的训练构建体验: 用户以访客身份在浏览器本地创建和保存 workout，由一个或多个 exercise block 组成；每个 block 支持设置动作时长、休息时长和重复次数，并可编辑名称、说明和图片。用户可以运行自动切换的计时器，并查看基础但有用的 workout 级统计数据。V1 不包含登录、云同步、原生 iOS/Android 客户端或 WebMCP 实现，但数据模型和架构需要为这些能力预留扩展路径。

## Document Status

- Status: Approved design draft
- Date: 2026-03-15
- Product: `Workout Timer`
- Platform: Web-first, mobile-friendly browser experience
- Scope: MVP design and product specification

## 1. Product Summary

`Workout Timer` is a web-first workout builder and interval runner that helps users create custom workouts from repeatable exercise blocks, run them with a focused automatic timer, and review lightweight workout-level stats over time.

The MVP is intentionally optimized for:

- Fast creation of custom interval workouts
- Smooth execution on phone and desktop browsers
- Local-first guest usage with persistent browser storage
- Easy deployment to a simple Linux VPS without requiring a backend runtime
- A clean migration path to future user accounts, native apps, and WebMCP support

The core unit in v1 is an `ExerciseBlock`:

- One block contains an exercise duration in seconds
- One block contains a rest duration in seconds
- One block contains a repeat count
- One block may also include a custom name, notes, and image

A workout is an ordered list of one or more blocks. In v1, `repeat` applies only to a single block. The MVP does not support repeating a grouped multi-exercise circuit as one unit.

## 2. Goals and Non-Goals

### Goals

- Let a guest user create and save custom workouts quickly
- Let a guest user run workouts reliably in a mobile-friendly browser UI
- Make exercise blocks editable after creation without friction
- Persist workouts and sessions locally in the browser
- Provide practical workout-level stats that make the app feel useful beyond the timer
- Keep deployment simple enough for a low-maintenance VPS setup
- Keep the system easy to extend toward accounts, sync, native clients, and WebMCP

### Non-Goals for v1

- User accounts, login, or cloud sync
- Sharing workouts between devices
- Native iOS or Android applications
- Advanced per-exercise analytics
- Repeating a multi-exercise circuit as a single repeatable group
- Social features, coaching features, or media-heavy guided workouts
- Shipping WebMCP integration in the MVP

## 3. Target User and Primary Use Cases

### Primary user

A user who wants to build custom interval-based workouts, save them, and run them repeatedly from a browser on phone or desktop without needing an account.

### Primary jobs to be done

- "I want to create a workout with my own durations and rest periods."
- "I want to reuse saved workouts without recreating them every time."
- "I want a clean timer I can trust during a session."
- "I want to see simple progress data such as how often I use a workout and how much total time I have trained."

## 4. MVP Feature Scope

### In scope

- Web application
- Responsive UI for desktop and mobile browsers
- Guest mode only
- Browser-local persistence
- Workout builder based on repeatable exercise blocks
- Per-block editing for name, exercise duration, rest duration, repeat count, notes, and image
- Saved workout library
- Automatic timer runner
- Completion summary after a session
- Workout-level stats dashboard

### Out of scope

- Account creation or authentication
- Cloud backup or sync
- Cross-device data portability in v1
- Native mobile apps
- Circuit/group repeat
- Exercise-level analytics history
- WebMCP runtime support

## 5. Core Product Concepts

### Workout

A saved template the user can view, edit, duplicate, delete, and run. A workout includes:

- Title
- Optional description
- Ordered exercise blocks
- Derived estimated duration
- Created and updated timestamps

### Exercise block

The basic building block of the workout. Each block includes:

- Name
- Exercise duration in seconds
- Rest duration in seconds
- Repeat count
- Optional notes/content
- Optional image
- Sort order within the workout

### Workout session

A historical record of running a workout. A session captures:

- Workout reference
- Start time
- End time
- Actual elapsed duration
- Status such as `completed` or `abandoned`
- Enough summary data to compute stats later without depending on the current template state

### Local guest profile

A lightweight local profile used only for browser-level persistence and future migration. It is not a real account in v1, but it can store app preferences, schema version, and any metadata needed for a future upgrade path.

## 6. Core User Flows

### 6.1 Create a workout

The user enters the product in guest mode and creates a workout through a structured builder flow.

The creation flow starts by adding an exercise block. For each block, the user enters:

- Exercise duration in seconds
- Rest duration in seconds
- Repeat count

After saving the block, the user may:

- Add another block using the same input pattern
- Finish the workout

The builder should feel guided rather than spreadsheet-like. It should work well on mobile and should not rely on precision interactions.

### 6.2 Edit a block or workout

After creation, the user can reopen a workout and overwrite existing values. Editable block fields include:

- Name
- Exercise duration
- Rest duration
- Repeat count
- Notes/content
- Image

Edits update the current saved workout template. They must not retroactively change historical completed sessions.

### 6.3 View saved workouts

The product provides a saved workout library stored locally in the browser. Each item should expose enough summary information to support quick scanning, including:

- Workout name
- Number of blocks
- Estimated total duration
- Last used time, if available

From the list, the user can:

- Open a workout
- Edit a workout
- Start a workout
- Duplicate a workout
- Delete a workout

### 6.4 Run a workout

When the user starts a workout, the app enters a focused timer runner.

Runner behavior in v1:

- Exercise countdown starts automatically
- Rest countdown starts automatically
- The next repeat starts automatically
- The next block starts automatically after the previous block completes

Runner controls should include:

- Pause
- Resume
- Skip current phase
- Go back one phase if feasible
- End workout early

The runner UI should clearly show:

- Current exercise name
- Current phase: `exercise` or `rest`
- Remaining time
- Current repeat number
- What comes next

### 6.5 Complete or abandon a workout

When a workout finishes, the product records a completed session and updates stats.

When a user exits early, the product should record an incomplete or abandoned session so completion rate remains meaningful.

The completion screen should show a lightweight summary such as:

- Workout name
- Elapsed duration
- Completion timestamp

### 6.6 View stats

The stats page should include:

- Total workouts created
- Total sessions completed
- Total minutes completed
- Most-used workout
- Average session length
- Completion rate

All stats are local to the current browser/device in v1.

## 7. Functional Requirements

### 7.1 Workout builder requirements

- The user can create a workout with one or more exercise blocks
- The builder supports adding multiple blocks sequentially
- The builder stores exercise duration, rest duration, and repeat count for each block
- The builder allows later overwrite-style edits for all block fields
- The builder should calculate estimated workout duration from block definitions
- Rest duration may be zero, allowing no-rest transitions when desired

### 7.2 Workout library requirements

- The app lists all saved workouts available in local storage
- The user can open, run, duplicate, edit, and delete a workout
- Duplicate creates a new workout based on the selected template
- Delete should include confirmation to reduce accidental loss

### 7.3 Timer runner requirements

- The runner executes all blocks in order
- For each block, the runner iterates the configured repeat count
- Each repeat contains an exercise phase followed by a rest phase, except the final repeat of the final block, which ends the workout without a trailing rest
- If another repeat or another block follows, the configured rest duration runs before that next activity starts
- Automatic transitions are the default behavior
- The timer should recover gracefully after brief tab switches or UI interruptions where possible

### 7.4 Session and stats requirements

- Completing a workout creates a `completed` session record
- Ending early creates an `abandoned` session record
- Stats calculations must derive from session records rather than live workout templates
- Historical sessions should remain stable even if the underlying workout template changes later

### 7.5 Persistence requirements

- Workouts persist in browser-local storage across reloads
- Sessions persist in browser-local storage across reloads
- The persistence layer includes schema versioning to support future migrations
- Images should be stored with reasonable size controls to reduce browser storage pressure

## 8. Data Model and Storage Strategy

### Recommended storage

Use `IndexedDB` as the primary persistence layer for v1 because it better fits structured local data plus optional images than simple key-value storage.

### Logical entities

#### Workout

- `id`
- `title`
- `description`
- `blocks`
- `estimatedDurationSec`
- `createdAt`
- `updatedAt`
- `lastUsedAt`
- `isDeleted` or equivalent soft-delete marker if historical session preservation is needed

#### ExerciseBlock

- `id`
- `workoutId`
- `order`
- `name`
- `exerciseDurationSec`
- `restDurationSec`
- `repeatCount`
- `notes`
- `image`

#### WorkoutSession

- `id`
- `workoutId`
- `workoutSnapshotTitle`
- `startedAt`
- `endedAt`
- `elapsedDurationSec`
- `status`
- `completedBlocks`
- `completedRepeats`

#### LocalProfile

- `schemaVersion`
- `preferences`
- Future migration metadata if accounts are added later

### Data model rules

- Workout templates and session history must remain separate
- Editing a workout updates the template only
- Past sessions should not be recalculated from the current template
- Deleting a workout should preferably preserve historical sessions while marking the original workout as deleted or detached

## 9. UX and Information Architecture

### Primary navigation

The MVP should keep navigation simple:

- `Workouts`
- `Builder`
- `Stats`

Depending on final implementation, `Builder` may also be entered from `Workouts` as a create/edit flow. The important product requirement is that the navigation remain lightweight and mobile-friendly.

### Core screens

- Workout library / home
- Create workout
- Edit workout
- Workout detail
- Timer runner
- Completion summary
- Stats dashboard

### Responsive UX requirements

- Builder uses step-based, stacked, or card-based interactions that work on phone screens
- Primary touch targets are thumb-friendly
- Timer runner uses large countdown text and high-contrast controls
- The product avoids desktop-only interactions such as hover-dependent actions or drag-heavy flows for core tasks
- The interface should feel credible as a future PWA, even if PWA packaging is not part of the MVP

## 10. Error Handling and Edge Cases

### Builder validation

- Exercise duration must be greater than zero
- Rest duration may be zero
- Repeat count must be a positive integer
- Required fields such as workout title must be validated before save

### Runner edge cases

- If the user pauses and resumes, the current phase should continue correctly
- If the user skips a phase, the session state should still remain internally consistent
- If the user exits early, the session should be recorded as abandoned rather than lost
- If browser timing drifts due to backgrounding or device constraints, the product should recover to the most accurate elapsed state practical in a web environment

### Storage edge cases

- If local storage or IndexedDB access fails, the app should show a clear non-technical error
- If image storage exceeds available quota, the app should prompt the user to use a smaller image or remove images
- If the browser data is cleared externally, local workouts and stats are lost; the product should acknowledge this limitation in v1

## 11. Analytics and Stats Definitions

Stats definitions should be explicit so the implementation plan does not need to guess.

- Total workouts created: number of currently stored workout templates created on this browser
- Total sessions completed: count of `completed` workout sessions
- Total minutes completed: sum of elapsed completed-session minutes
- Most-used workout: the workout with the highest number of started sessions, regardless of whether each session finished
- Average session length: average elapsed duration across completed sessions
- Completion rate: completed sessions divided by total started sessions

## 12. Architecture and Boundary Guidance

The implementation should keep three concerns separate so future expansion does not require a rewrite:

- Product/domain logic
- Persistence/storage logic
- Presentation/UI logic

Recommended unit boundaries:

- A domain layer that models workout sequencing, repeat logic, and stats calculations
- A persistence layer that reads and writes workouts, sessions, and images to local storage
- A runner state layer that manages timer progression and runner controls
- A UI layer that renders the builder, library, runner, and stats pages

This separation is important for future migration to:

- User accounts and cloud sync
- Native iOS and Android clients
- WebMCP exposure of workout read/write actions

## 13. Non-Functional Requirements

### Reliability

The timer should feel trustworthy during normal browser use. A timer product loses value quickly if transitions or elapsed time feel inconsistent.

### Performance

Creating, editing, loading, and starting workouts should feel immediate in local-first operation.

### Deployment portability

The MVP should build into static web assets that can be served from a simple Linux VPS using a standard web server such as Nginx or Caddy. The runtime deployment target should not require Node.js application hosting, a database, or server-side rendering for v1.

### Accessibility

The product should support:

- Large timer text
- Clear labels for phases and actions
- Visible focus states
- Keyboard accessibility for major controls
- Reasonable screen reader labeling on form and runner screens

### Mobile usability

All major workflows must be practical on a phone browser without zooming, precision tapping, or dense data-entry patterns.

### Extensibility

The data and code structure should support future accounts, sync, native apps, and WebMCP without forcing a redesign of the product model.

## 14. Testing Focus for Implementation Planning

The highest-risk areas to cover in a later implementation plan are:

- Timer sequencing across blocks and repeats
- Exercise/rest automatic transitions
- Pause, resume, skip, and early-exit behavior
- Local persistence of workouts and sessions
- Correct stats calculations
- Editing behavior that preserves historical sessions
- Responsive behavior on common mobile viewport sizes

## 15. Future Roadmap Alignment

The MVP should leave room for, but not implement, the following later capabilities:

- Real accounts and cloud sync
- Backup/import/export
- Native iOS and Android applications
- Richer exercise analytics
- Multi-exercise circuit repeat
- WebMCP integration aligned with Chrome's emerging WebMCP direction
- AI-assisted workout generation or editing

## 16. Decisions Confirmed in This Design

- The product is web-first
- Mobile browser support is required in v1
- The product is builder-first rather than timer-first or analytics-first
- V1 supports repeating a single exercise block only
- Stats are workout-level, not deep exercise-level analytics
- Guest mode ships first
- Persistence is local in the browser, with a future account migration path
- Workout execution uses automatic transitions by default
- WebMCP is explicitly deferred beyond v1
