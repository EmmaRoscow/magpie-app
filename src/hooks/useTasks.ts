import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Task } from '../types/task';

const STORAGE_KEY_TASKS = 'TASKS';

export interface UseTasksReturn {
  tasks: Task[];
  isLoading: boolean;
  categories: string[];
  addTask: (name: string, points: number, category?: string) => void;
  completeTask: (id: string) => void;
  uncompleteTask: (id: string) => void;
  deleteTask: (id: string) => void;
  reorderIncompleteTasks: (newData: Task[]) => void;
  setTaskCompletedAt: (id: string, completedAt: string) => void;
}

export function useTasks(
  adjustPoints: (delta: number) => void,
  lastResetISO: string
): UseTasksReturn {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const tasksRef = useRef<Task[]>(tasks);
  tasksRef.current = tasks;

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY_TASKS)
      .then((raw) => {
        if (raw) setTasks(JSON.parse(raw) as Task[]);
      })
      .catch((err) => console.warn('useTasks: load failed', err))
      .finally(() => setIsLoading(false));
  }, []);

  const persist = useCallback((next: Task[]) => {
    AsyncStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(next)).catch((err) =>
      console.warn('useTasks: save failed', err)
    );
  }, []);

  const addTask = useCallback(
    (name: string, points: number, category?: string) => {
      const task: Task = {
        id: Date.now().toString(),
        name,
        points,
        category: category || undefined,
        createdAt: new Date().toISOString(),
      };
      setTasks((prev) => {
        const next = [...prev, task];
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const completeTask = useCallback(
    (id: string) => {
      const task = tasksRef.current.find((t) => t.id === id);
      if (!task || task.completedAt) return;
      const completedAt = new Date().toISOString();
      adjustPoints(task.points);
      setTasks((prev) => {
        const next = prev.map((t) => (t.id === id ? { ...t, completedAt } : t));
        persist(next);
        return next;
      });
    },
    [adjustPoints, persist]
  );

  const uncompleteTask = useCallback(
    (id: string) => {
      const task = tasksRef.current.find((t) => t.id === id);
      if (!task || !task.completedAt) return;
      if (task.completedAt > lastResetISO) {
        adjustPoints(-task.points);
      }
      setTasks((prev) => {
        const next = prev.map((t) =>
          t.id === id ? { ...t, completedAt: undefined } : t
        );
        persist(next);
        return next;
      });
    },
    [adjustPoints, lastResetISO, persist]
  );

  const deleteTask = useCallback(
    (id: string) => {
      const task = tasksRef.current.find((t) => t.id === id);
      if (!task) return;
      if (task.completedAt && task.completedAt > lastResetISO) {
        adjustPoints(-task.points);
      }
      setTasks((prev) => {
        const next = prev.filter((t) => t.id !== id);
        persist(next);
        return next;
      });
    },
    [adjustPoints, lastResetISO, persist]
  );

  // Replaces the incomplete tasks array with a new ordering (from drag-to-reorder).
  const reorderIncompleteTasks = useCallback(
    (newData: Task[]) => {
      setTasks((prev) => {
        const completed = prev.filter((t) => !!t.completedAt);
        const next = [...newData, ...completed];
        persist(next);
        return next;
      });
    },
    [persist]
  );

  // Backdates a completed task. Deducts points if moving it out of the current period.
  const setTaskCompletedAt = useCallback(
    (id: string, completedAt: string) => {
      const task = tasksRef.current.find((t) => t.id === id);
      if (!task || !task.completedAt) return;
      if (task.completedAt > lastResetISO && completedAt <= lastResetISO) {
        adjustPoints(-task.points);
      }
      setTasks((prev) => {
        const next = prev.map((t) =>
          t.id === id ? { ...t, completedAt } : t
        );
        persist(next);
        return next;
      });
    },
    [adjustPoints, lastResetISO, persist]
  );

  const sortedTasks = useMemo(() => {
    // Incomplete tasks keep their array order so drag-to-reorder is preserved.
    const incomplete = tasks.filter((t) => !t.completedAt);
    // Completed tasks: newest first.
    const complete = tasks
      .filter((t) => !!t.completedAt)
      .sort((a, b) => b.completedAt!.localeCompare(a.completedAt!));
    return [...incomplete, ...complete];
  }, [tasks]);

  const categories = useMemo(
    () => [...new Set(tasks.map((t) => t.category).filter(Boolean) as string[])],
    [tasks]
  );

  return {
    tasks: sortedTasks,
    isLoading,
    categories,
    addTask,
    completeTask,
    uncompleteTask,
    deleteTask,
    reorderIncompleteTasks,
    setTaskCompletedAt,
  };
}
