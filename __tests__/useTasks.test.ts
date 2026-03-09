import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTasks } from '../src/hooks/useTasks';

const TODAY_RESET = '2024-01-16T09:00:00.000Z';  // simulated last reset (9am today)
const BEFORE_RESET = '2024-01-16T08:00:00.000Z';  // task completed before reset
const AFTER_RESET  = '2024-01-16T10:00:00.000Z';  // task completed after reset

function makeTask(overrides: Record<string, unknown> = {}) {
  return {
    id: '1',
    name: 'Test task',
    points: 3,
    createdAt: '2024-01-16T07:00:00.000Z',
    ...overrides,
  };
}

describe('useTasks', () => {
  let adjustPoints: jest.Mock;

  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    adjustPoints = jest.fn();
  });

  it('starts with empty tasks when storage is empty', async () => {
    const { result } = renderHook(() => useTasks(adjustPoints, TODAY_RESET));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.tasks).toHaveLength(0);
  });

  it('loads persisted tasks from AsyncStorage on mount', async () => {
    const stored = [makeTask()];
    await AsyncStorage.setItem('TASKS', JSON.stringify(stored));

    const { result } = renderHook(() => useTasks(adjustPoints, TODAY_RESET));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.tasks).toHaveLength(1);
    expect(result.current.tasks[0].name).toBe('Test task');
  });

  it('addTask creates a task with correct fields', async () => {
    const { result } = renderHook(() => useTasks(adjustPoints, TODAY_RESET));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.addTask('Walk the dog', 5, 'Health');
    });

    expect(result.current.tasks).toHaveLength(1);
    const task = result.current.tasks[0];
    expect(task.name).toBe('Walk the dog');
    expect(task.points).toBe(5);
    expect(task.category).toBe('Health');
    expect(task.completedAt).toBeUndefined();
    expect(task.createdAt).toBeTruthy();
  });

  it('addTask without category leaves category undefined', async () => {
    const { result } = renderHook(() => useTasks(adjustPoints, TODAY_RESET));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.addTask('Read', 2));

    expect(result.current.tasks[0].category).toBeUndefined();
  });

  it('addTask persists to AsyncStorage', async () => {
    const { result } = renderHook(() => useTasks(adjustPoints, TODAY_RESET));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.addTask('Exercise', 4));

    await waitFor(async () => {
      const stored = await AsyncStorage.getItem('TASKS');
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored!);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].name).toBe('Exercise');
    });
  });

  it('completeTask sets completedAt and calls adjustPoints', async () => {
    const stored = [makeTask({ id: '1', points: 3 })];
    await AsyncStorage.setItem('TASKS', JSON.stringify(stored));

    const { result } = renderHook(() => useTasks(adjustPoints, TODAY_RESET));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.completeTask('1'));

    expect(result.current.tasks[0].completedAt).toBeTruthy();
    expect(adjustPoints).toHaveBeenCalledWith(3);
  });

  it('completeTask is a no-op if task is already completed', async () => {
    const stored = [makeTask({ completedAt: AFTER_RESET })];
    await AsyncStorage.setItem('TASKS', JSON.stringify(stored));

    const { result } = renderHook(() => useTasks(adjustPoints, TODAY_RESET));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.completeTask('1'));

    expect(adjustPoints).not.toHaveBeenCalled();
  });

  it('uncompleteTask clears completedAt', async () => {
    const stored = [makeTask({ completedAt: AFTER_RESET })];
    await AsyncStorage.setItem('TASKS', JSON.stringify(stored));

    const { result } = renderHook(() => useTasks(adjustPoints, TODAY_RESET));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.uncompleteTask('1'));

    expect(result.current.tasks[0].completedAt).toBeUndefined();
  });

  it('uncompleteTask deducts points when task was completed after last reset', async () => {
    const stored = [makeTask({ points: 3, completedAt: AFTER_RESET })];
    await AsyncStorage.setItem('TASKS', JSON.stringify(stored));

    const { result } = renderHook(() => useTasks(adjustPoints, TODAY_RESET));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.uncompleteTask('1'));

    expect(adjustPoints).toHaveBeenCalledWith(-3);
  });

  it('uncompleteTask does NOT deduct points when task was completed before last reset', async () => {
    const stored = [makeTask({ points: 3, completedAt: BEFORE_RESET })];
    await AsyncStorage.setItem('TASKS', JSON.stringify(stored));

    const { result } = renderHook(() => useTasks(adjustPoints, TODAY_RESET));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.uncompleteTask('1'));

    expect(adjustPoints).not.toHaveBeenCalled();
  });

  it('deleteTask removes the task', async () => {
    const stored = [makeTask()];
    await AsyncStorage.setItem('TASKS', JSON.stringify(stored));

    const { result } = renderHook(() => useTasks(adjustPoints, TODAY_RESET));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.deleteTask('1'));

    expect(result.current.tasks).toHaveLength(0);
  });

  it('deleteTask deducts points when task was completed after last reset', async () => {
    const stored = [makeTask({ points: 3, completedAt: AFTER_RESET })];
    await AsyncStorage.setItem('TASKS', JSON.stringify(stored));

    const { result } = renderHook(() => useTasks(adjustPoints, TODAY_RESET));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.deleteTask('1'));

    expect(adjustPoints).toHaveBeenCalledWith(-3);
  });

  it('deleteTask does NOT deduct points when task was completed before last reset', async () => {
    const stored = [makeTask({ points: 3, completedAt: BEFORE_RESET })];
    await AsyncStorage.setItem('TASKS', JSON.stringify(stored));

    const { result } = renderHook(() => useTasks(adjustPoints, TODAY_RESET));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.deleteTask('1'));

    expect(adjustPoints).not.toHaveBeenCalled();
  });

  it('deleteTask does NOT deduct points when task is incomplete', async () => {
    const stored = [makeTask({ points: 3 })];
    await AsyncStorage.setItem('TASKS', JSON.stringify(stored));

    const { result } = renderHook(() => useTasks(adjustPoints, TODAY_RESET));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.deleteTask('1'));

    expect(adjustPoints).not.toHaveBeenCalled();
  });

  it('returns incomplete tasks before completed tasks', async () => {
    const stored = [
      makeTask({ id: '1', name: 'Completed', createdAt: '2024-01-16T07:00:00.000Z', completedAt: AFTER_RESET }),
      makeTask({ id: '2', name: 'Pending', createdAt: '2024-01-16T07:30:00.000Z' }),
    ];
    await AsyncStorage.setItem('TASKS', JSON.stringify(stored));
    const { result } = renderHook(() => useTasks(adjustPoints, TODAY_RESET));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.tasks[0].name).toBe('Pending');
    expect(result.current.tasks[1].name).toBe('Completed');
  });

  it('returns unique categories derived from tasks', async () => {
    const stored = [
      makeTask({ id: '1', category: 'Health' }),
      makeTask({ id: '2', category: 'Work' }),
      makeTask({ id: '3', category: 'Health' }),
    ];
    await AsyncStorage.setItem('TASKS', JSON.stringify(stored));
    const { result } = renderHook(() => useTasks(adjustPoints, TODAY_RESET));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.categories).toEqual(expect.arrayContaining(['Health', 'Work']));
    expect(result.current.categories).toHaveLength(2);
  });

  it('reorderIncompleteTasks updates task ordering', async () => {
    const stored = [
      makeTask({ id: '1', name: 'First' }),
      makeTask({ id: '2', name: 'Second' }),
    ];
    await AsyncStorage.setItem('TASKS', JSON.stringify(stored));
    const { result } = renderHook(() => useTasks(adjustPoints, TODAY_RESET));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.reorderIncompleteTasks([
        makeTask({ id: '2', name: 'Second' }),
        makeTask({ id: '1', name: 'First' }),
      ]);
    });

    expect(result.current.tasks[0].id).toBe('2');
    expect(result.current.tasks[1].id).toBe('1');
  });

  it('setTaskCompletedAt updates the completedAt timestamp', async () => {
    const stored = [makeTask({ id: '1', completedAt: AFTER_RESET })];
    await AsyncStorage.setItem('TASKS', JSON.stringify(stored));
    const { result } = renderHook(() => useTasks(adjustPoints, TODAY_RESET));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => { result.current.setTaskCompletedAt('1', BEFORE_RESET); });

    expect(result.current.tasks[0].completedAt).toBe(BEFORE_RESET);
  });

  it('setTaskCompletedAt deducts points when moving from current to past period', async () => {
    const stored = [makeTask({ id: '1', points: 5, completedAt: AFTER_RESET })];
    await AsyncStorage.setItem('TASKS', JSON.stringify(stored));
    const { result } = renderHook(() => useTasks(adjustPoints, TODAY_RESET));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => { result.current.setTaskCompletedAt('1', BEFORE_RESET); });

    expect(adjustPoints).toHaveBeenCalledWith(-5);
  });

  it('setTaskCompletedAt does NOT deduct points when staying in current period', async () => {
    const AFTER_RESET_2 = '2024-01-16T11:00:00.000Z';
    const stored = [makeTask({ id: '1', points: 5, completedAt: AFTER_RESET })];
    await AsyncStorage.setItem('TASKS', JSON.stringify(stored));
    const { result } = renderHook(() => useTasks(adjustPoints, TODAY_RESET));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => { result.current.setTaskCompletedAt('1', AFTER_RESET_2); });

    expect(adjustPoints).not.toHaveBeenCalled();
  });
});
