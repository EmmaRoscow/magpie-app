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

  it('adjustPoints increases points by the given delta', async () => {
    await AsyncStorage.setItem('LAST_RESET_DATE', new Date().toISOString());

    const { result } = renderHook(() => useDailyPoints());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.adjustPoints(5);
    });

    expect(result.current.points).toBe(5);
  });

  it('adjustPoints decreases points with a negative delta', async () => {
    await AsyncStorage.setItem('DAILY_POINTS', '10');
    await AsyncStorage.setItem('LAST_RESET_DATE', new Date().toISOString());

    const { result } = renderHook(() => useDailyPoints());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.adjustPoints(-3);
    });

    expect(result.current.points).toBe(7);
  });

  it('adjustPoints persists the new value to AsyncStorage', async () => {
    await AsyncStorage.setItem('LAST_RESET_DATE', new Date().toISOString());

    const { result } = renderHook(() => useDailyPoints());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.adjustPoints(2);
      result.current.adjustPoints(3);
    });

    await waitFor(async () => {
      const stored = await AsyncStorage.getItem('DAILY_POINTS');
      expect(stored).toBe('5');
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

  it('exposes lastResetISO after loading', async () => {
    const resetDate = new Date().toISOString();
    await AsyncStorage.setItem('LAST_RESET_DATE', resetDate);
    await AsyncStorage.setItem('DAILY_POINTS', '0');

    const { result } = renderHook(() => useDailyPoints());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.lastResetISO).toBe(resetDate);
  });

  it('handles storage read errors gracefully', async () => {
    mockAsyncStorage.multiGet.mockRejectedValueOnce(new Error('Storage error'));

    const { result } = renderHook(() => useDailyPoints());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.points).toBe(0);
  });

  it('saves a history snapshot to HISTORY when a reset occurs', async () => {
    await AsyncStorage.setItem('DAILY_POINTS', '55');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(12, 0, 0, 0);
    const yesterdayISO = yesterday.toISOString();
    await AsyncStorage.setItem('LAST_RESET_DATE', yesterdayISO);

    const { result } = renderHook(() => useDailyPoints());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await waitFor(async () => {
      const histRaw = await AsyncStorage.getItem('HISTORY');
      expect(histRaw).not.toBeNull();
      const hist = JSON.parse(histRaw!);
      expect(hist).toHaveLength(1);
      expect(hist[0].points).toBe(55);
      expect(hist[0].periodStart).toBe(yesterdayISO);
      expect(hist[0].periodEnd).toBeTruthy();
    });
  });

  it('does not save a history snapshot when no previous reset date exists', async () => {
    await AsyncStorage.clear();

    const { result } = renderHook(() => useDailyPoints());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const histRaw = await AsyncStorage.getItem('HISTORY');
    expect(histRaw).toBeNull();
  });
});
