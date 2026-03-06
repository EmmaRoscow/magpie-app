import { renderHook, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useHistory } from '../src/hooks/useHistory';

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('useHistory', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  it('starts loading and returns empty arrays when storage is empty', async () => {
    const { result } = renderHook(() => useHistory());
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.snapshots).toHaveLength(0);
    expect(result.current.allTasks).toHaveLength(0);
  });

  it('loads snapshots from HISTORY key', async () => {
    const snapshots = [
      { periodStart: '2024-01-15T03:00:00.000Z', periodEnd: '2024-01-16T03:00:00.000Z', points: 42 },
    ];
    await AsyncStorage.setItem('HISTORY', JSON.stringify(snapshots));

    const { result } = renderHook(() => useHistory());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.snapshots).toHaveLength(1);
    expect(result.current.snapshots[0].points).toBe(42);
    expect(result.current.snapshots[0].periodStart).toBe('2024-01-15T03:00:00.000Z');
  });

  it('loads tasks from TASKS key', async () => {
    const tasks = [
      { id: '1', name: 'Read', points: 3, createdAt: '2024-01-15T08:00:00.000Z', completedAt: '2024-01-15T10:00:00.000Z' },
    ];
    await AsyncStorage.setItem('TASKS', JSON.stringify(tasks));

    const { result } = renderHook(() => useHistory());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.allTasks).toHaveLength(1);
    expect(result.current.allTasks[0].name).toBe('Read');
  });

  it('loads both snapshots and tasks together', async () => {
    const snapshots = [
      { periodStart: '2024-01-15T03:00:00.000Z', periodEnd: '2024-01-16T03:00:00.000Z', points: 30 },
    ];
    const tasks = [
      { id: '1', name: 'Exercise', points: 5, createdAt: '2024-01-15T07:00:00.000Z' },
    ];
    await AsyncStorage.setItem('HISTORY', JSON.stringify(snapshots));
    await AsyncStorage.setItem('TASKS', JSON.stringify(tasks));

    const { result } = renderHook(() => useHistory());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.snapshots).toHaveLength(1);
    expect(result.current.allTasks).toHaveLength(1);
  });

  it('handles storage read errors gracefully', async () => {
    mockAsyncStorage.getItem.mockRejectedValueOnce(new Error('Storage error'));

    const { result } = renderHook(() => useHistory());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.snapshots).toHaveLength(0);
    expect(result.current.allTasks).toHaveLength(0);
  });
});
