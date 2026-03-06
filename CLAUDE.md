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

    App.tsx                              # Entry point — DailyPointsProvider + AppNavigator
    src/
      context/DailyPointsContext.tsx    # React context wrapping useDailyPoints
      navigation/AppNavigator.tsx       # Bottom tab navigator (Home / Tasks)
      screens/HomeScreen.tsx            # Points counter (indigo-900 background)
      screens/TasksScreen.tsx           # Task list with add/complete/delete
      components/AddTaskModal.tsx       # Bottom-sheet modal for creating tasks
      hooks/useDailyPoints.ts           # State: load from storage, reset at 3am, adjustPoints
      hooks/useTasks.ts                 # Task CRUD + points integration
      utils/resetLogic.ts               # Pure utility: shouldReset(lastResetISO, now?) -> boolean
      types/task.ts                     # Task interface
    __tests__/
      resetLogic.test.ts                # Unit tests for 3am reset boundary logic
      useDailyPoints.test.ts            # Hook tests (AsyncStorage mocked)
      useTasks.test.ts                  # Task hook tests
      HomeScreen.test.tsx               # UI tests (context mocked)
      TasksScreen.test.tsx              # UI tests (context + hook mocked)

## Key Business Rules

- Daily target: 100 points
- Points reset to 0 at 3am every day
- Reset is lazy: checked on mount and whenever the app returns to foreground
- Completing a task adds its points to the daily counter immediately
- Un-completing a task deducts its points only if it was completed in the current reset period
- Deleting a completed task also deducts its points if completed in the current period
- Tasks persist across days (no reset at 3am)
- Task points are integers; negative values are allowed
- Default points per task: 2

## AsyncStorage Keys

| Key               | Value                                    |
|-------------------|------------------------------------------|
|     | Stringified integer, e.g.          |
|  | ISO timestamp of last reset              |
|            | JSON array of Task objects               |

## Task Object Shape

    {
      id:          string           // Date.now() string
      name:        string           // required
      points:      number           // integer, default 2
      category?:   string           // optional, free-text
      createdAt:   string           // ISO timestamp
      completedAt?: string          // ISO timestamp; undefined = incomplete
    }

## Dev Commands

    npm install             # Install dependencies
    npx expo start          # Start Expo dev server
    npx expo run:android    # Build and run on connected Android device / emulator
    npm test                # Run all tests once
    npm run test:watch      # Run tests in watch mode

## Architecture Notes

 in  is a pure module tested exhaustively with plain inputs.

 exposes  (replaces the old ) and .
Both are made available app-wide via .

 takes both values as parameters so it remains independently
testable without any React context setup. Optimistic updates: state is set synchronously,
AsyncStorage writes happen in the background.

"Same period" check for point deduction:  (ISO string
comparison is lexicographically equivalent to chronological order).
