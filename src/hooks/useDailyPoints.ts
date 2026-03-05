import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { shouldReset } from '../utils/resetLogic';

const STORAGE_KEY_POINTS = 'DAILY_POINTS';
const STORAGE_KEY_LAST_RESET = 'LAST_RESET_DATE';

export const DAILY_TARGET = 100;

export interface UseDailyPointsReturn {
  points: number;
  target: number;
  isLoading: boolean;
  increment: () => void;
}

export function useDailyPoints(): UseDailyPointsReturn {
  const [points, setPoints] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  const loadAndMaybeReset = useCallback(async () => {
    try {
      const results = await AsyncStorage.multiGet([
        STORAGE_KEY_POINTS,
        STORAGE_KEY_LAST_RESET,
      ]);
      const rawPoints = results[0][1];
      const rawLastReset = results[1][1];

      // Treat a missing last-reset as epoch (always trigger a reset on first run)
      const lastResetISO = rawLastReset ?? new Date(0).toISOString();

      if (shouldReset(lastResetISO)) {
        await AsyncStorage.multiSet([
          [STORAGE_KEY_POINTS, '0'],
          [STORAGE_KEY_LAST_RESET, new Date().toISOString()],
        ]);
        setPoints(0);
      } else {
        const parsed = rawPoints !== null ? parseInt(rawPoints, 10) : 0;
        setPoints(Number.isNaN(parsed) ? 0 : parsed);
      }
    } catch (error) {
      console.warn('useDailyPoints: storage read failed', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load on mount
  useEffect(() => {
    loadAndMaybeReset();
  }, [loadAndMaybeReset]);

  // Re-check reset when the app comes back to foreground (handles 3am crossover)
  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (
          appState.current.match(/inactive|background/) &&
          nextState === 'active'
        ) {
          loadAndMaybeReset();
        }
        appState.current = nextState;
      }
    );
    return () => subscription.remove();
  }, [loadAndMaybeReset]);

  const increment = useCallback(() => {
    setPoints((prev) => {
      const next = prev + 1;
      AsyncStorage.setItem(STORAGE_KEY_POINTS, String(next)).catch((err) =>
        console.warn('useDailyPoints: storage write failed', err)
      );
      return next;
    });
  }, []);

  return { points, target: DAILY_TARGET, isLoading, increment };
}
