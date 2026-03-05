# life-app

A React Native / Expo daily points tracker for Android. Proof of concept for a future productivity app.

## Tech Stack

- Expo SDK 54.0.6
- React Native 0.81.4
- React 19.1.0
- TypeScript 5.8.x
- AsyncStorage for persistence
- Jest + @testing-library/react-native for tests

## Project Structure

```
App.tsx                        # Entry point — renders HomeScreen
src/
  screens/HomeScreen.tsx       # Single UI screen (indigo background, points, button)
  hooks/useDailyPoints.ts      # State: load from storage, reset at 3am, increment
  utils/resetLogic.ts          # Pure utility: shouldReset(lastResetISO, now?) → boolean
__tests__/
  resetLogic.test.ts           # Unit tests for 3am reset boundary logic
  useDailyPoints.test.ts       # Hook tests (AsyncStorage mocked)
  HomeScreen.test.tsx          # UI tests (hook mocked)
```

## Key Business Rules

- Daily target: 100 points
- Points reset to 0 at 3am every day
- Reset is lazy: checked on mount and whenever the app returns to foreground
- Points and last reset timestamp are persisted via AsyncStorage

## AsyncStorage Keys

| Key               | Value                          |
|-------------------|-------------------------------|
| `DAILY_POINTS`    | Stringified integer, e.g. `"42"` |
| `LAST_RESET_DATE` | ISO date string of last reset  |

## Dev Commands

```bash
npm install             # Install dependencies
npx expo start          # Start Expo dev server
npx expo run:android    # Build and run on connected Android device / emulator
npm test                # Run all tests once
npm run test:watch      # Run tests in watch mode
```

## Architecture Notes

The `shouldReset` function in `src/utils/resetLogic.ts` is kept as a pure module (no React dependencies) so it can be tested exhaustively with plain inputs — no mocks, no timers. The injectable `now` parameter lets tests pin the clock to any value.

The `useDailyPoints` hook uses an optimistic update strategy for `increment`: state is updated synchronously for instant UI feedback, and the AsyncStorage write happens asynchronously in the background.
