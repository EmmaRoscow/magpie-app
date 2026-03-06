import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DaySnapshot } from '../types/history';
import { Task } from '../types/task';

const HISTORY_KEY = 'HISTORY';
const TASKS_KEY = 'TASKS';

export interface UseHistoryReturn {
  snapshots: DaySnapshot[];
  allTasks: Task[];
  isLoading: boolean;
}

export function useHistory(): UseHistoryReturn {
  const [snapshots, setSnapshots] = useState<DaySnapshot[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [histRaw, tasksRaw] = await Promise.all([
          AsyncStorage.getItem(HISTORY_KEY),
          AsyncStorage.getItem(TASKS_KEY),
        ]);
        setSnapshots(histRaw ? JSON.parse(histRaw) : []);
        setAllTasks(tasksRaw ? JSON.parse(tasksRaw) : []);
      } catch {
        // leave as empty arrays on error
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  return { snapshots, allTasks, isLoading };
}
