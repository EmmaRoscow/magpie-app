import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDailyPoints } from '../src/hooks/useDailyPoints';

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('useDailyPoints', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  it('starts with 0 points when storage is empty', async () => {
    const { result } = renderHook(() => useDailyPoints());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.points).toBe(0);
    expect(result.current.target).toBe(100);
  });

  it('loads persisted points when no reset is needed', async () => {
    await AsyncStorage.setItem('DAILY_POINTS', '42');
    await AsyncStorage.setItem('LAST_RESET_DATE', new Date().toISOString());

    const { result } = renderHook(() => useDailyPoints());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.points).toBe(42);
  });

  it('resets points when last reset was before the 3am boundary', async () => {
    await AsyncStorage.setItem('DAILY_POINTS', '75');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(12, 0, 0, 0);
    await AsyncStorage.setItem('LAST_RESET_DATE', yesterday.toISOString());

    const { result } = renderHook(() => useDailyPoints());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.points).toBe(0);
  });

  it('increment increases points by 1', async () => {
    await AsyncStorage.setItem('LAST_RESET_DATE', new Date().toISOString());

    const { result } = renderHook(() => useDailyPoints());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.increment();
    });

    expect(result.current.points).toBe(1);
  });

  it('increment persists the new value to AsyncStorage', async () => {
    await AsyncStorage.setItem('LAST_RESET_DATE', new Date().toISOString());

    const { result } = renderHook(() => useDailyPoints());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.increment();
      result.current.increment();
    });

    await waitFor(async () => {
      const stored = await AsyncStorage.getItem('DAILY_POINTS');
      expect(stored).toBe('2');
    });
  });

  it('exposes a target of 100', async () => {
    const { result } = renderHook(() => useDailyPoints());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.target).toBe(100);
  });

  it('starts in loading state', () => {
    const { result } = renderHook(() => useDailyPoints());
    expect(result.current.isLoading).toBe(true);
  });

  it('handles storage read errors gracefully', async () => {
    mockAsyncStorage.multiGet.mockRejectedValueOnce(new Error('Storage error'));

    const { result } = renderHook(() => useDailyPoints());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Falls back to 0 on error
    expect(result.current.points).toBe(0);
  });
});
