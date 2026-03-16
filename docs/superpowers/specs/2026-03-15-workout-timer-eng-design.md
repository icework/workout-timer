# Workout Timer Engineering Design

中文摘要：
本文档定义了 Workout Timer MVP 的技术架构和实现方案。技术栈采用 React + TypeScript + Vite + Tailwind CSS + Zustand + Dexie.js。架构分为四层：UI 层（React 组件）、状态层（Zustand stores）、领域层（纯 TypeScript 业务逻辑）、持久层（Dexie.js + IndexedDB）。核心设计原则是将领域逻辑与 UI 和存储隔离，为未来的原生应用和后端同步预留扩展路径。文档包含数据模型、计时器引擎设计、状态管理、持久化策略、UI 组件结构和分阶段执行计划。

## Document Status

- Status: Approved design
- Date: 2026-03-15
- Product: Workout Timer
- Type: Engineering Design Document
- Related: [Product Spec](../../../2026-03-15-workout-timer-web-mvp-design.md)

## 1. Technology Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Framework | React 18 + TypeScript | Popular ecosystem, good for complex state (timer logic) |
| Build Tool | Vite | Fast dev server, optimized static builds, modern defaults |
| Styling | Tailwind CSS | Utility-first, rapid mobile-first development |
| State Management | Zustand | Lightweight, simple API, clean extension path for future sync |
| Persistence | Dexie.js | Clean Promise API, TypeScript support, schema migrations |
| Storage | IndexedDB | Structured local data, supports images, better than localStorage |

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        UI Layer (React)                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐│
│  │  Workout │ │  Builder │ │  Timer   │ │  Stats   │ │ Common ││
│  │  Library │ │  Screen  │ │  Runner  │ │Dashboard │ │  UI    ││
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────────┘│
└───────┼────────────┼────────────┼────────────┼──────────────────┘
        │            │            │            │
┌───────▼────────────▼────────────▼────────────▼──────────────────┐
│                     State Layer (Zustand)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │ workoutStore │  │  timerStore  │  │ sessionStore │           │
│  │  - workouts  │  │  - phase     │  │  - sessions  │           │
│  │  - current   │  │  - remaining │  │  - stats     │           │
│  │  - CRUD ops  │  │  - controls  │  │  - history   │           │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘           │
└─────────┼─────────────────┼─────────────────┼───────────────────┘
          │                 │                 │
┌─────────▼─────────────────▼─────────────────▼───────────────────┐
│                   Domain Layer (Pure TS)                         │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐     │
│  │ Workout Logic  │  │  Timer Engine  │  │ Stats Calculator│     │
│  │ - sequencing   │  │  - countdown   │  │ - aggregations │     │
│  │ - validation   │  │  - transitions │  │ - completion % │     │
│  │ - duration calc│  │  - phase mgmt  │  │ - most used    │     │
│  └────────────────┘  └────────────────┘  └────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
          │                                   │
┌─────────▼───────────────────────────────────▼───────────────────┐
│                 Persistence Layer (Dexie.js)                     │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                      IndexedDB                           │    │
│  │   workouts    │   exerciseBlocks   │   sessions   │ profile │
│  └─────────────────────────────────────────────────────────┘    │
└────────────────────────────────────���────────────────────────────┘
```

### Key Design Principles

1. **Domain Layer Isolation**: Pure TypeScript with no React/storage dependencies. Enables future native apps and backend migration.

2. **Timer Engine Separation**: Core timer logic independent of UI. Handles phase transitions, pause/resume, and drift correction.

3. **Store-per-Concern**: Separate Zustand stores for workouts, timer state, and sessions. Clean boundaries, easy testing.

4. **Persistence Abstraction**: Dexie wrapper allows swapping to API calls later without changing store logic.

## 3. Project Structure

```
workout-timer/
├── src/
│   ├── domain/           # Pure TS, no React/storage deps
│   │   ├── workout.ts    # Workout/Block types, validation, duration calc
│   │   ├── timer.ts      # Timer engine: phases, transitions, sequencing
│   │   ├── session.ts    # Session types, completion logic
│   │   └── stats.ts      # Stats calculations (pure functions)
│   │
│   ├── stores/           # Zustand stores
│   │   ├── workoutStore.ts
│   │   ├── timerStore.ts
│   │   └── sessionStore.ts
│   │
│   ├── persistence/      # Dexie DB layer
│   │   ├── db.ts         # Dexie instance, schema, migrations
│   │   ├── workoutRepo.ts
│   │   └── sessionRepo.ts
│   │
│   ├── components/       # Reusable UI components
│   │   ├── Timer/
│   │   ├── BlockCard/
│   │   ├── DurationInput/
│   │   └── ...
│   │
│   ├── pages/            # Route-level screens
│   │   ├── WorkoutLibrary/
│   │   ├── WorkoutBuilder/
│   │   ├── WorkoutDetail/
│   │   ├── TimerRunner/
│   │   ├── CompletionSummary/
│   │   └── Stats/
│   │
│   ├── hooks/            # Custom React hooks
│   ├── utils/            # Formatting, helpers
│   └── App.tsx           # Router setup
│
├── index.html
├── tailwind.config.js
├── vite.config.ts
└── package.json
```

## 4. Data Models

### 4.1 Workout

```typescript
interface Workout {
  id: string;
  title: string;
  description?: string;
  blocks: ExerciseBlock[];
  estimatedDurationSec: number;  // derived from blocks
  createdAt: Date;
  updatedAt: Date;
  lastUsedAt?: Date;
  isDeleted: boolean;  // soft delete for session preservation
}
```

### 4.2 ExerciseBlock

```typescript
interface ExerciseBlock {
  id: string;
  workoutId: string;
  order: number;
  name: string;
  exerciseDurationSec: number;  // must be > 0
  restDurationSec: number;       // can be 0
  repeatCount: number;           // must be >= 1
  notes?: string;
  imageUrl?: string;  // base64 data URL or blob URL
}
```

### 4.3 WorkoutSession

```typescript
interface WorkoutSession {
  id: string;
  workoutId: string;
  workoutSnapshotTitle: string;  // frozen at session start
  startedAt: Date;
  endedAt?: Date;
  elapsedDurationSec: number;
  status: 'in_progress' | 'completed' | 'abandoned';
  completedBlocks: number;
  completedRepeats: number;
  totalBlocks: number;      // snapshot for stats
  totalRepeats: number;     // snapshot for stats
}
```

### 4.4 TimerState

```typescript
type TimerPhase = 'exercise' | 'rest' | 'finished';

interface TimerState {
  phase: TimerPhase;
  remainingSec: number;
  currentBlockIndex: number;
  currentRepeat: number;      // 1-based
  isPaused: boolean;
  isRunning: boolean;
}
```

### 4.5 LocalProfile

```typescript
interface LocalProfile {
  id: string;  // singleton 'default'
  schemaVersion: number;
  preferences: {
    soundEnabled: boolean;
    vibrationEnabled: boolean;
  };
}
```

### Data Model Design Decisions

- Session stores `workoutSnapshotTitle` and totals so stats remain accurate even if workout is edited/deleted later
- `isDeleted` soft-delete on Workout preserves session history
- Timer state is separate from persistence — it's ephemeral runtime state

## 5. Timer Engine Design

### 5.1 Sequence Model

```typescript
interface TimerSequence {
  phases: SequencePhase[];  // flattened list of all phases
  totalDurationSec: number;
}

interface SequencePhase {
  type: 'exercise' | 'rest';
  blockIndex: number;
  blockName: string;
  repeat: number;        // 1-based
  durationSec: number;
}
```

### 5.2 Sequencing Example

```
Input:
- Block 1: 30s exercise, 10s rest, repeat 2x
- Block 2: 45s exercise, 0s rest, repeat 1x

Flattened sequence:
[exercise-30s] → [rest-10s] → [exercise-30s] → [rest-10s] →
[exercise-45s] → [finished]

Note: Rest phases run between repeats and between blocks.
Only the final repeat of the final block skips trailing rest.
```

### 5.3 Timer Engine Responsibilities

| Function | Purpose |
|----------|---------|
| `buildSequence(workout)` | Flatten blocks into linear phase list |
| `tick(state, elapsedMs)` | Advance timer, handle phase transitions |
| `skip(state)` | Jump to next phase |
| `goBack(state)` | Return to previous phase start (restarts that phase's timer) |
| `pause(state)` | Set isPaused = true |
| `resume(state)` | Set isPaused = false |

### 5.4 Drift Correction

- Use `performance.now()` for elapsed time, not interval counting
- On each tick, calculate actual elapsed vs expected
- If tab was backgrounded, catch up to correct position

### 5.5 Browser Backgrounding

- `visibilitychange` event detects tab hide/show
- On return, recalculate position based on wall-clock time
- Accept that audio cues may be missed while backgrounded

## 6. State Management

### 6.1 WorkoutStore

```typescript
interface WorkoutStore {
  workouts: Workout[];
  currentWorkout: Workout | null;
  isLoading: boolean;

  // Actions
  loadWorkouts: () => Promise<void>;
  createWorkout: (title: string) => Promise<Workout>;
  updateWorkout: (id: string, updates: Partial<Workout>) => Promise<void>;
  deleteWorkout: (id: string) => Promise<void>;  // soft delete
  duplicateWorkout: (id: string) => Promise<Workout>;
  addBlock: (workoutId: string, block: Omit<ExerciseBlock, 'id' | 'workoutId' | 'order'>) => Promise<void>;
  updateBlock: (blockId: string, updates: Partial<ExerciseBlock>) => Promise<void>;
  removeBlock: (blockId: string) => Promise<void>;
  reorderBlocks: (workoutId: string, blockIds: string[]) => Promise<void>;
}
```

### 6.2 TimerStore

```typescript
interface TimerStore {
  state: TimerState | null;
  sequence: TimerSequence | null;
  sessionId: string | null;

  // Actions
  startWorkout: (workout: Workout) => Promise<void>;  // creates session
  tick: () => void;           // called by interval
  pause: () => void;
  resume: () => void;
  skip: () => void;
  goBack: () => void;
  endEarly: () => Promise<void>;  // marks session abandoned
  complete: () => Promise<void>;  // marks session completed
}
```

### 6.3 SessionStore

```typescript
interface SessionStore {
  sessions: WorkoutSession[];
  stats: ComputedStats | null;

  // Actions
  loadSessions: () => Promise<void>;
  createSession: (workout: Workout) => Promise<WorkoutSession>;
  updateSession: (id: string, updates: Partial<WorkoutSession>) => Promise<void>;
  computeStats: () => ComputedStats;
}
```

### 6.4 ComputedStats

```typescript
interface ComputedStats {
  totalWorkoutsCreated: number;
  totalSessionsCompleted: number;
  totalMinutesCompleted: number;
  mostUsedWorkout: { id: string; title: string; count: number } | null;
  averageSessionLengthMin: number;
  completionRate: number;  // completed / total started
}
```

### 6.5 Store Interaction Flow

1. User clicks "Start Workout" → `timerStore.startWorkout(workout)`
2. Timer store calls `sessionStore.createSession(workout)` to record start
3. Timer runs via `setInterval` calling `timerStore.tick()`
4. On finish → `timerStore.complete()` → `sessionStore.updateSession()`
5. Stats page calls `sessionStore.computeStats()`

## 7. Persistence Layer

### 7.1 Dexie Schema

```typescript
import Dexie, { Table } from 'dexie';

class WorkoutTimerDB extends Dexie {
  workouts!: Table<Workout>;
  blocks!: Table<ExerciseBlock>;
  sessions!: Table<WorkoutSession>;
  profile!: Table<LocalProfile>;

  constructor() {
    super('WorkoutTimerDB');

    this.version(1).stores({
      workouts: 'id, createdAt, updatedAt, lastUsedAt, isDeleted',
      blocks: 'id, workoutId, order',
      sessions: 'id, workoutId, startedAt, status',
      profile: 'id'
    });
  }
}

export const db = new WorkoutTimerDB();
```

### 7.2 Repository Pattern

```typescript
// persistence/workoutRepo.ts
export const workoutRepo = {
  async getAll(): Promise<Workout[]> {
    const workouts = await db.workouts.where('isDeleted').equals(0).toArray();
    for (const w of workouts) {
      w.blocks = await db.blocks.where('workoutId').equals(w.id).sortBy('order');
    }
    return workouts;
  },

  async save(workout: Workout): Promise<void> {
    await db.transaction('rw', [db.workouts, db.blocks], async () => {
      await db.workouts.put(workout);
      for (const block of workout.blocks) {
        await db.blocks.put(block);
      }
    });
  },

  async softDelete(id: string): Promise<void> {
    await db.workouts.update(id, { isDeleted: true, updatedAt: new Date() });
  }
};
```

### 7.3 Image Storage

- Store as base64 data URLs in `ExerciseBlock.imageUrl`
- Compress/resize on upload (max 200KB recommended)
- If quota exceeded, prompt user to remove images

### 7.4 Migration Path for Future Backend

- Repos become the swap point — replace Dexie calls with API calls
- Store interfaces stay the same
- Add sync status tracking when needed

## 8. UI Components & Routing

### 8.1 Routes

```typescript
<BrowserRouter>
  <Routes>
    <Route path="/" element={<WorkoutLibrary />} />
    <Route path="/workout/new" element={<WorkoutBuilder />} />
    <Route path="/workout/:id" element={<WorkoutDetail />} />
    <Route path="/workout/:id/edit" element={<WorkoutBuilder />} />
    <Route path="/workout/:id/run" element={<TimerRunner />} />
    <Route path="/workout/:id/complete" element={<CompletionSummary />} />
    <Route path="/stats" element={<Stats />} />
  </Routes>
  <BottomNav />
</BrowserRouter>
```

### 8.2 Key Components

| Component | Purpose |
|-----------|---------|
| `BottomNav` | Fixed bottom navigation (Workouts / Stats) |
| `WorkoutCard` | Library list item with title, duration, actions |
| `BlockCard` | Displays block in builder/detail view |
| `BlockForm` | Add/edit block modal with duration inputs |
| `DurationInput` | Minutes:seconds input with +/- buttons |
| `TimerDisplay` | Large countdown with phase indicator |
| `TimerControls` | Pause/Resume, Skip, Back, End buttons |
| `ProgressBar` | Visual progress through workout |
| `StatCard` | Single stat display for dashboard |

### 8.3 Mobile-First Patterns

- Touch targets minimum 44x44px
- Bottom sheet modals for forms (not centered dialogs)
- Swipe actions on cards where appropriate
- Large timer text (80px+ on runner screen)
- No hover-dependent interactions

### 8.4 Accessibility

- Semantic HTML (`<button>`, `<nav>`, `<main>`)
- ARIA labels on icon-only buttons
- Focus visible states
- Screen reader announcements for phase changes

## 9. Execution Plan

### Phase 1: Project Setup & Domain Layer

**Goal**: Foundation with testable business logic

- Initialize Vite + React + TypeScript project
- Configure Tailwind CSS
- Implement domain types (`workout.ts`, `session.ts`)
- Implement timer engine (`timer.ts`)
- Implement stats calculator (`stats.ts`)
- Set up Dexie database schema
- Unit tests for domain logic

**Deliverables**: Working domain layer with tests, project scaffolding complete

### Phase 2: Persistence & State

**Goal**: Data layer wired up and working

- Implement `workoutRepo` (CRUD operations)
- Implement `sessionRepo` (session tracking)
- Create `workoutStore` with Zustand
- Create `sessionStore` with Zustand
- Create `timerStore` with Zustand
- Wire stores to persistence layer
- Integration tests for store ↔ persistence

**Deliverables**: Stores can create/read/update workouts and sessions

### Phase 3: Workout Builder

**Goal**: Users can create and manage workouts

- Workout library page (list, delete, duplicate)
- Create workout flow
- Add/edit/remove blocks
- Block reordering (drag or move up/down)
- Duration input components
- Workout detail view
- Form validation

**Deliverables**: Full workout CRUD working in UI

### Phase 4: Timer Runner

**Goal**: Core timer functionality working

- Timer engine integration with store
- Timer display component (large countdown)
- Timer controls (pause, resume, skip, back, end)
- Phase transitions and sequencing
- Progress indicator
- Browser backgrounding handling
- Session recording on complete/abandon
- Completion summary screen

**Deliverables**: Can run a workout start to finish, sessions recorded

### Phase 5: Stats & Polish

**Goal**: Feature complete MVP

- Stats dashboard with all calculations
- Responsive refinements across all screens
- Error handling and edge cases
- Loading states
- Empty states
- Image upload for blocks (optional, if time permits)
- Sound/vibration preferences (optional)

**Deliverables**: All MVP features working

### Phase 6: Deployment

**Goal**: Live on VPS

- Production build optimization
- Static asset deployment to VPS
- Nginx/Caddy configuration
- Basic smoke testing in production

**Deliverables**: App accessible via public URL

## 10. Testing Strategy

### Unit Tests (Domain Layer)

- Timer sequencing across blocks and repeats
- Phase transition logic
- Duration calculations
- Stats calculations
- Validation functions

### Integration Tests (Store + Persistence)

- Workout CRUD operations
- Session creation and updates
- Store state consistency

### Component Tests

- Timer display renders correctly
- Controls trigger correct actions
- Form validation works

### E2E Tests (Critical Paths)

- Create workout → add blocks → save
- Start workout → complete → view stats
- Pause/resume during workout

## 11. Risk Areas

| Risk | Mitigation |
|------|------------|
| Timer drift in background | Use wall-clock time, recalculate on visibility change |
| IndexedDB quota exceeded | Compress images, show clear error, allow image removal |
| Complex timer state bugs | Extensive unit tests, state machine approach |
| Mobile browser inconsistencies | Test on iOS Safari, Chrome Android early |

## 12. Future Extension Points

The architecture supports these future additions without major refactoring:

- **User accounts**: Add auth layer, swap repos to API calls
- **Cloud sync**: Add sync status to models, conflict resolution in repos
- **Native apps**: Domain layer is portable, reuse in React Native
- **WebMCP**: Expose workout CRUD via MCP protocol
- **Circuit repeat**: Extend sequence builder to handle grouped blocks
