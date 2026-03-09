# magpie-app

A React Native / Expo daily points tracker for Android. Proof of concept for a future productivity app.

## Tech Stack

- Expo SDK 54.0.6
- React Native 0.81.4
- React 19.1.0
- TypeScript 5.8.x
- React Navigation 7 (bottom tabs)
- AsyncStorage for persistence
- react-native-reanimated ~4.1.0 (required by DraggableFlatList; pinned to match Expo Go SDK 54)
- react-native-gesture-handler ~2.28.0 (required by DraggableFlatList; pinned to match Expo Go SDK 54)
- react-native-worklets 0.5.1 (peer dep of reanimated; pinned to match Expo Go SDK 54 native binary)
- react-native-draggable-flatlist ^4.0.3 (drag-to-reorder incomplete tasks)
- @react-native-community/datetimepicker ^8.6.0 (change completion date)
- Jest + @testing-library/react-native for tests

## Project Structure

    App.tsx                              # Entry point: GestureHandlerRootView + DailyPointsProvider + AppNavigator
    jest.setup.js                        # Sets process.env.TZ = 'UTC' for timezone-stable tests
    babel.config.js                      # Includes react-native-reanimated/plugin
    src/
      context/DailyPointsContext.tsx    # React context wrapping useDailyPoints
      navigation/AppNavigator.tsx       # Bottom tab navigator (Home / Tasks)
      screens/HomeScreen.tsx            # Points counter + swipeable history browser (virtual days)
      screens/TasksScreen.tsx           # Task list: drag-to-reorder, date picker, filter
      components/AddTaskModal.tsx       # Bottom-sheet modal for creating tasks
      hooks/useDailyPoints.ts           # State: load from storage, reset at 3am, adjustPoints, snapshot on reset
      hooks/useTasks.ts                 # Task CRUD + points integration + reorder + backdate
      hooks/useHistory.ts               # Loads HISTORY snapshots + all tasks from AsyncStorage
      utils/resetLogic.ts               # Pure utility: shouldReset(lastResetISO, now?) -> boolean
      types/task.ts                     # Task interface
      types/history.ts                  # DaySnapshot interface
    __mocks__/
      react-native-draggable-flatlist.js          # Jest mock: wraps FlatList, passes drag/isActive
      @react-native-community/datetimepicker.js   # Jest mock: renders plain View
    __tests__/
      resetLogic.test.ts                # Unit tests for 3am reset boundary logic
      useDailyPoints.test.ts            # Hook tests (AsyncStorage mocked)
      useTasks.test.ts                  # Task hook tests (includes reorder + backdate tests)
      useHistory.test.ts                # History hook tests
      HomeScreen.test.tsx               # UI tests (context + useHistory mocked)
      TasksScreen.test.tsx              # UI tests (context + hook mocked)

## Key Business Rules

- Daily target: 100 points
- Points reset to 0 at 3am every day
- Reset is lazy: checked on mount and whenever the app returns to foreground
- On each reset, if a previous reset date exists, the ending period is snapshotted to HISTORY
- Completing a task adds its points to the daily counter immediately
- Un-completing a task deducts its points only if it was completed in the current reset period
- Deleting a completed task also deducts its points if completed in the current period
- Tasks persist across days (no reset at 3am)
- Task points are integers; negative values are allowed
- Default points per task: 2
- Incomplete tasks can be drag-to-reordered (long-press task name to initiate drag)
- HomeScreen shows one virtual 3am-to-3am day entry for every calendar day back to the earliest
  known data, even if the app was never opened that day (points derived from tasks, not snapshots)
- TasksScreen Completed section only shows tasks completed after lastResetISO; past-day
  completed tasks are invisible on TasksScreen (visible only in HomeScreen history)
- Long-pressing a completed task opens a native date picker to backdate its completedAt;
  if the task moves out of the current period, its points are deducted from today's total

## AsyncStorage Keys

| Key              | Value                                              |
|------------------|----------------------------------------------------|
| DAILY_POINTS     | Stringified integer, e.g. "42"                     |
| LAST_RESET_DATE  | ISO timestamp of last reset                        |
| TASKS            | JSON array of Task objects                         |
| HISTORY          | JSON array of DaySnapshot objects, newest first    |

## Task Object Shape

    {
      id:           string    // Date.now() string
      name:         string    // required
      points:       number    // integer, default 2
      category?:    string    // optional, free-text
      createdAt:    string    // ISO timestamp
      completedAt?: string    // ISO timestamp; undefined = incomplete
    }

## DaySnapshot Object Shape

    {
      periodStart:  string    // ISO timestamp of reset that started this period
      periodEnd:    string    // ISO timestamp of reset that ended this period
      points:       number    // total points at time of snapshot (not used for display;
                              // HomeScreen derives displayed points from allTasks)
    }

## Dev Commands

    npm install             # Install dependencies
    npx expo start          # Start Expo dev server
    npx expo run:android    # Build and run on connected Android device / emulator
    npm test                # Run all tests once
    npm run test:watch      # Run tests in watch mode

## Architecture Notes

The shouldReset function in src/utils/resetLogic.ts is a pure module tested exhaustively
with plain inputs - no mocks, no timers. The injectable now parameter lets tests pin the clock.

useDailyPoints exposes adjustPoints(delta) and lastResetISO. Both are made available app-wide
via DailyPointsContext/useDailyPointsContext. On each 3am reset, if rawLastReset is non-null,
a DaySnapshot is written to HISTORY before the reset executes. History save failure is caught
independently so it never blocks the reset.

useTasks takes adjustPoints and lastResetISO as parameters rather than consuming context
directly, so it is independently testable without any React context setup.
Optimistic updates: state is set synchronously; AsyncStorage writes happen in the background.
Incomplete tasks maintain array order (drag-to-reorder preserved). Completed tasks sort newest-first.
reorderIncompleteTasks(newData) splices the new ordering in front of completed tasks and persists.
setTaskCompletedAt(id, completedAt) deducts points if the task moves from current to past period.

useHistory reads HISTORY and TASKS in parallel from AsyncStorage on mount via a stable
useCallback (load). It exposes refresh: load so callers can re-read without remounting.
HomeScreen calls refresh() via useFocusEffect whenever the screen regains focus (skipping
the initial mount via a hasMounted ref to avoid a double-read). This ensures that backdating
a task on TasksScreen is immediately reflected when navigating back to HomeScreen.

"Same period" check for point deduction: task.completedAt > lastResetISO
(ISO string comparison is lexicographically equivalent to chronological order).

snap3am(date) in HomeScreen snaps a Date back to the most recent 3am boundary in local time.
virtualDays is built from the earliest millisecond across all snapshots and completed tasks up
to snap3am(lastResetISO), generating one entry per calendar day. Points shown are task-derived
(filter allTasks by completedAt within the period), so backdating a task automatically updates
the history view. virtualDaysLenRef keeps the PanResponder callbacks in sync without recreating
the responder.

TasksScreen uses DraggableFlatList (from react-native-draggable-flatlist) for incomplete tasks,
with completed tasks rendered in ListFooterComponent to avoid nested scroll conflicts.
App.tsx wraps everything in GestureHandlerRootView (required by DraggableFlatList).
The DateTimePicker is rendered conditionally when datePickerTaskId is set; onChange sets
completedAt to noon of the picked date (safely inside the 3am-midnight window in any timezone).

Test timezone: jest.setup.js sets process.env.TZ = 'UTC' via setupFiles so snap3am behaves
predictably. All navigation test data uses exact UTC 3am timestamps (e.g. '2024-01-15T03:00:00.000Z')
and sets lastResetISO to '2024-01-16T03:00:00.000Z' to produce exactly one virtual day.
