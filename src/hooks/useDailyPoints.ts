import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { shouldReset } from '../utils/resetLogic';
import { DaySnapshot } from '../types/history';

const STORAGE_KEY_POINTS = 'DAILY_POINTS';
const STORAGE_KEY_LAST_RESET = 'LAST_RESET_DATE';
const STORAGE_KEY_HISTORY = 'HISTORY';

export const DAILY_TARGET = 100;

export interface UseDailyPointsReturn {
  points: number;
  target: number;
  isLoading: boolean;
  lastResetISO: string;
  adjustPoints: (delta: number) => void;
}

export function useDailyPoints(): UseDailyPointsReturn {
  const [points, setPoints] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastResetISO, setLastResetISO] = useState<string>(new Date(0).toISOString());
  const appState = useRef<AppStateStatus>(AppState.currentState);

  const loadAndMaybeReset = useCallback(async () => {
    try {
      const results = await AsyncStorage.multiGet([
        STORAGE_KEY_POINTS,
        STORAGE_KEY_LAST_RESET,
      ]);
      const rawPoints = results[0][1];
      const rawLastReset = results[1][1];

      const storedLastReset = rawLastReset ?? new Date(0).toISOString();

      if (shouldReset(storedLastReset)) {
        const nowISO = new Date().toISOString();
        if (rawLastReset !== null) {
          const prevPoints = rawPoints !== null ? parseInt(rawPoints, 10) : 0;
          const snapshot: DaySnapshot = {
            periodStart: rawLastReset,
            periodEnd: nowISO,
            points: Number.isNaN(prevPoints) ? 0 : prevPoints,
          };
          try {
            const histRaw = await AsyncStorage.getItem(STORAGE_KEY_HISTORY);
            const hist: DaySnapshot[] = histRaw ? JSON.parse(histRaw) : [];
            await AsyncStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify([snapshot, ...hist]));
          } catch {
            // don't prevent reset if history save fails
          }
        }
        await AsyncStorage.multiSet([
          [STORAGE_KEY_POINTS, '0'],
          [STORAGE_KEY_LAST_RESET, nowISO],
        ]);
        setPoints(0);
        setLastResetISO(nowISO);
      } else {
        const parsed = rawPoints !== null ? parseInt(rawPoints, 10) : 0;
        setPoints(Number.isNaN(parsed) ? 0 : parsed);
        setLastResetISO(storedLastReset);
      }
    } catch (error) {
      console.warn('useDailyPoints: storage read failed', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAndMaybeReset();
  }, [loadAndMaybeReset]);

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

  const adjustPoints = useCallback((delta: number) => {
    setPoints((prev) => {
      const next = prev + delta;
      AsyncStorage.setItem(STORAGE_KEY_POINTS, String(next)).catch((err) =>
        console.warn('useDailyPoints: storage write failed', err)
      );
      return next;
    });
  }, []);

  return { points, target: DAILY_TARGET, isLoading, lastResetISO, adjustPoints };
}
