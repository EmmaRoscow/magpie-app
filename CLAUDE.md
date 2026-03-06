# magpie-app

A React Native / Expo daily points tracker for Android. Proof of concept for a future productivity app.

## Tech Stack

- Expo SDK 54.0.6
- React Native 0.81.4
- React 19.1.0
- TypeScript 5.8.x
- React Navigation 7 (bottom tabs)
- AsyncStorage for persistence
- Jest + @testing-library/react-native for tests

## Project Structure

    App.tsx                              # Entry point: DailyPointsProvider + AppNavigator
    src/
      context/DailyPointsContext.tsx    # React context wrapping useDailyPoints
      navigation/AppNavigator.tsx       # Bottom tab navigator (Home / Tasks)
      screens/HomeScreen.tsx            # Points counter + swipeable history browser
      screens/TasksScreen.tsx           # Task list with add/complete/delete
      components/AddTaskModal.tsx       # Bottom-sheet modal for creating tasks
      hooks/useDailyPoints.ts           # State: load from storage, reset at 3am, adjustPoints, snapshot on reset
      hooks/useTasks.ts                 # Task CRUD + points integration
      hooks/useHistory.ts               # Loads HISTORY snapshots + all tasks from AsyncStorage
      utils/resetLogic.ts               # Pure utility: shouldReset(lastResetISO, now?) -> boolean
      types/task.ts                     # Task interface
      types/history.ts                  # DaySnapshot interface
    __tests__/
      resetLogic.test.ts                # Unit tests for 3am reset boundary logic
      useDailyPoints.test.ts            # Hook tests (AsyncStorage mocked)
      useTasks.test.ts                  # Task hook tests
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
- HomeScreen lets you swipe left/right (or tap arrows) to browse past day snapshots (read-only)

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
      points:       number    // total points earned during this period
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

useDailyPoints exposes adjustPoints(delta) (replaces the old increment) and lastResetISO.
Both are made available app-wide via DailyPointsContext/useDailyPointsContext.
On each 3am reset, if rawLastReset is non-null, a DaySnapshot is written to HISTORY before
the reset executes. History save failure is caught independently so it never blocks the reset.

useTasks takes adjustPoints and lastResetISO as parameters rather than consuming context
directly, so it is independently testable without any React context setup.
Optimistic updates: state is set synchronously; AsyncStorage writes happen in the background.

useHistory reads HISTORY and TASKS in parallel from AsyncStorage on mount. It is used only
by HomeScreen to power the swipeable day browser.

"Same period" check for point deduction: task.completedAt > lastResetISO
(ISO string comparison is lexicographically equivalent to chronological order).

HomeScreen uses PanResponder for swipe gestures. dayOffsetRef and snapshotsLenRef are
updated each render (not in useEffect) so PanResponder callbacks always see fresh values
without the responder needing to be recreated.
