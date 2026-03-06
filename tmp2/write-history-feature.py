import os

BASE = r'C:\Users\emmar\OneDrive\Documents\Coding\life-app'

def write_file(rel_path, content):
    full = os.path.join(BASE, rel_path.replace('/', os.sep))
    with open(full, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'Written: {rel_path} ({len(content.splitlines())} lines)')

def patch_file(rel_path, old, new):
    full = os.path.join(BASE, rel_path.replace('/', os.sep))
    with open(full, 'r', encoding='utf-8') as f:
        content = f.read()
    if old not in content:
        raise ValueError(f'Patch target not found in {rel_path}:\n{old!r}')
    content = content.replace(old, new, 1)
    with open(full, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'Patched: {rel_path}')

# ============================================================
# 1. src/types/history.ts
# ============================================================
write_file('src/types/history.ts', """export interface DaySnapshot {
  periodStart: string; // ISO timestamp of previous reset (start of this period)
  periodEnd: string;   // ISO timestamp of this reset (end of this period)
  points: number;      // total points earned during this period
}
""")

# ============================================================
# 2. src/hooks/useHistory.ts
# ============================================================
write_file('src/hooks/useHistory.ts', """import { useState, useEffect } from 'react';
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
""")

# ============================================================
# 3. src/hooks/useDailyPoints.ts — patch to save snapshot on reset
# ============================================================
patch_file('src/hooks/useDailyPoints.ts',
    "import { shouldReset } from '../utils/resetLogic';",
    "import { shouldReset } from '../utils/resetLogic';\nimport { DaySnapshot } from '../types/history';"
)
patch_file('src/hooks/useDailyPoints.ts',
    "const STORAGE_KEY_LAST_RESET = 'LAST_RESET_DATE';",
    "const STORAGE_KEY_LAST_RESET = 'LAST_RESET_DATE';\nconst STORAGE_KEY_HISTORY = 'HISTORY';"
)
patch_file('src/hooks/useDailyPoints.ts',
    "      if (shouldReset(storedLastReset)) {\n        const nowISO = new Date().toISOString();\n        await AsyncStorage.multiSet([\n          [STORAGE_KEY_POINTS, '0'],\n          [STORAGE_KEY_LAST_RESET, nowISO],\n        ]);\n        setPoints(0);\n        setLastResetISO(nowISO);",
    "      if (shouldReset(storedLastReset)) {\n        const nowISO = new Date().toISOString();\n        if (rawLastReset !== null) {\n          const prevPoints = rawPoints !== null ? parseInt(rawPoints, 10) : 0;\n          const snapshot: DaySnapshot = {\n            periodStart: rawLastReset,\n            periodEnd: nowISO,\n            points: Number.isNaN(prevPoints) ? 0 : prevPoints,\n          };\n          try {\n            const histRaw = await AsyncStorage.getItem(STORAGE_KEY_HISTORY);\n            const hist: DaySnapshot[] = histRaw ? JSON.parse(histRaw) : [];\n            await AsyncStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify([snapshot, ...hist]));\n          } catch {\n            // don't prevent reset if history save fails\n          }\n        }\n        await AsyncStorage.multiSet([\n          [STORAGE_KEY_POINTS, '0'],\n          [STORAGE_KEY_LAST_RESET, nowISO],\n        ]);\n        setPoints(0);\n        setLastResetISO(nowISO);"
)

# ============================================================
# 4. src/screens/HomeScreen.tsx — complete rewrite
# ============================================================
write_file('src/screens/HomeScreen.tsx', """import React, { useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  PanResponder,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDailyPointsContext } from '../context/DailyPointsContext';
import { useHistory } from '../hooks/useHistory';

const COLORS = {
  background: '#312E81',
  backgroundPast: '#1E1B4B',
  textPrimary: '#FFFFFF',
  textMuted: '#A5B4FC',
  navBtnDisabled: 'rgba(165, 180, 252, 0.3)',
  todayBtnBg: '#6366F1',
  navBorder: 'rgba(99, 102, 241, 0.3)',
  pastTaskBg: 'rgba(99, 102, 241, 0.15)',
};

function formatPeriodDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export function HomeScreen() {
  const { points, target, isLoading: pointsLoading } = useDailyPointsContext();
  const { snapshots, allTasks, isLoading: historyLoading } = useHistory();
  const [dayOffset, setDayOffset] = useState(0);

  // Refs keep PanResponder callbacks fresh without recreating the responder
  const dayOffsetRef = useRef(0);
  const snapshotsLenRef = useRef(0);
  dayOffsetRef.current = dayOffset;
  snapshotsLenRef.current = snapshots.length;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > Math.abs(gs.dy) && Math.abs(gs.dx) > 10,
      onPanResponderRelease: (_, gs) => {
        if (gs.dx < -50 && -dayOffsetRef.current < snapshotsLenRef.current) {
          setDayOffset(dayOffsetRef.current - 1);
        } else if (gs.dx > 50 && dayOffsetRef.current < 0) {
          setDayOffset(dayOffsetRef.current + 1);
        }
      },
    })
  ).current;

  const isLoading = pointsLoading || historyLoading;
  const isToday = dayOffset === 0;
  const snapshot = !isToday ? (snapshots[-dayOffset - 1] ?? null) : null;
  const canGoBack = -dayOffset < snapshots.length;
  const canGoForward = dayOffset < 0;

  const dayTasks = useMemo(() => {
    if (!snapshot) return [];
    return allTasks
      .filter(
        (t) =>
          t.completedAt &&
          t.completedAt >= snapshot.periodStart &&
          t.completedAt < snapshot.periodEnd
      )
      .sort((a, b) => (a.completedAt! < b.completedAt! ? -1 : 1));
  }, [snapshot, allTasks]);

  const dateLabel = isToday
    ? 'Today'
    : snapshot
    ? formatPeriodDate(snapshot.periodStart)
    : '\u2014';

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.textPrimary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, !isToday && styles.containerPast]}>
      <View style={styles.navBar}>
        <TouchableOpacity
          onPress={() => canGoBack && setDayOffset(dayOffset - 1)}
          style={styles.navBtn}
          testID="nav-back"
        >
          <Text style={[styles.navArrow, !canGoBack && styles.navArrowDisabled]}>\u2039</Text>
        </TouchableOpacity>

        <Text style={styles.navDate} numberOfLines={1}>{dateLabel}</Text>

        <View style={styles.navRight}>
          {!isToday && (
            <TouchableOpacity
              onPress={() => setDayOffset(0)}
              style={styles.todayBtn}
              testID="nav-today"
            >
              <Text style={styles.todayBtnText}>Today</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => canGoForward && setDayOffset(dayOffset + 1)}
            style={styles.navBtn}
            testID="nav-forward"
          >
            <Text style={[styles.navArrow, !canGoForward && styles.navArrowDisabled]}>\u203a</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.swipeArea} {...panResponder.panHandlers}>
        {isToday ? (
          <View style={styles.todayContent}>
            <Text style={styles.label}>Daily Points</Text>
            <View style={styles.scoreRow}>
              <Text style={styles.points} testID="points-display">{points}</Text>
              <Text style={styles.target}>/ {target}</Text>
            </View>
          </View>
        ) : snapshot ? (
          <ScrollView
            contentContainerStyle={styles.pastContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.pastPointsLabel}>Points earned</Text>
            <Text style={styles.pastPoints} testID="past-points-display">
              {snapshot.points}
            </Text>

            <Text style={styles.pastSectionLabel}>
              {dayTasks.length > 0 ? 'Tasks completed' : 'No tasks completed'}
            </Text>

            {dayTasks.map((task) => (
              <View key={task.id} style={styles.pastTask}>
                <View style={styles.pastTaskInfo}>
                  <Text style={styles.pastTaskName}>{task.name}</Text>
                  {task.category ? (
                    <Text style={styles.pastTaskCategory}>{task.category}</Text>
                  ) : null}
                </View>
                <Text style={styles.pastTaskPoints}>
                  {task.points > 0 ? '+' : ''}{task.points}
                </Text>
              </View>
            ))}
          </ScrollView>
        ) : (
          <View style={styles.todayContent}>
            <Text style={styles.label}>No data for this day</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  containerPast: { backgroundColor: COLORS.backgroundPast },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.navBorder,
  },
  navBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  navArrow: { fontSize: 32, color: COLORS.textMuted, lineHeight: 36 },
  navArrowDisabled: { color: COLORS.navBtnDisabled },
  navDate: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  navRight: { flexDirection: 'row', alignItems: 'center' },
  todayBtn: {
    backgroundColor: COLORS.todayBtnBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 4,
  },
  todayBtnText: { color: COLORS.textPrimary, fontSize: 12, fontWeight: '600' },
  swipeArea: { flex: 1 },
  todayContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textMuted,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 24,
  },
  scoreRow: { flexDirection: 'row', alignItems: 'flex-end' },
  points: { fontSize: 96, fontWeight: '700', color: COLORS.textPrimary, lineHeight: 104 },
  target: {
    fontSize: 32,
    fontWeight: '400',
    color: COLORS.textMuted,
    marginBottom: 12,
    marginLeft: 8,
  },
  pastContent: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 40 },
  pastPointsLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  pastPoints: {
    fontSize: 80,
    fontWeight: '700',
    color: COLORS.textPrimary,
    lineHeight: 88,
    marginBottom: 40,
  },
  pastSectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  pastTask: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.pastTaskBg,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  pastTaskInfo: { flex: 1 },
  pastTaskName: { fontSize: 15, fontWeight: '500', color: COLORS.textPrimary },
  pastTaskCategory: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  pastTaskPoints: { fontSize: 14, fontWeight: '700', color: COLORS.textMuted },
});
""")

# ============================================================
# 5. __tests__/useHistory.test.ts
# ============================================================
write_file('__tests__/useHistory.test.ts', """import { renderHook, waitFor } from '@testing-library/react-native';
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
""")

# ============================================================
# 6. __tests__/HomeScreen.test.tsx — rewrite with useHistory mock
# ============================================================
write_file('__tests__/HomeScreen.test.tsx', """import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { HomeScreen } from '../src/screens/HomeScreen';
import * as DailyPointsContextModule from '../src/context/DailyPointsContext';
import * as useHistoryModule from '../src/hooks/useHistory';
import { UseDailyPointsReturn } from '../src/hooks/useDailyPoints';

const baseHistory = { snapshots: [], allTasks: [], isLoading: false };

function mockContext(overrides: Partial<UseDailyPointsReturn> = {}) {
  jest.spyOn(DailyPointsContextModule, 'useDailyPointsContext').mockReturnValue({
    points: 0,
    target: 100,
    isLoading: false,
    lastResetISO: new Date().toISOString(),
    adjustPoints: jest.fn(),
    ...overrides,
  });
}

function mockHistory(overrides: Partial<typeof baseHistory> = {}) {
  jest.spyOn(useHistoryModule, 'useHistory').mockReturnValue({ ...baseHistory, ...overrides });
}

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHistory();
  });

  it('renders the current points', () => {
    mockContext({ points: 42 });
    render(<HomeScreen />);
    expect(screen.getByTestId('points-display')).toHaveTextContent('42');
  });

  it('renders the daily target', () => {
    mockContext({ points: 0, target: 100 });
    render(<HomeScreen />);
    expect(screen.getByText('/ 100')).toBeTruthy();
  });

  it('shows an activity indicator while loading', () => {
    mockContext({ isLoading: true });
    render(<HomeScreen />);
    expect(screen.queryByTestId('points-display')).toBeNull();
  });

  it('shows content once loading is complete', () => {
    mockContext({ isLoading: false, points: 7 });
    render(<HomeScreen />);
    expect(screen.getByTestId('points-display')).toHaveTextContent('7');
  });

  it('shows Today as the nav date label on load', () => {
    mockContext();
    render(<HomeScreen />);
    expect(screen.getByText('Today')).toBeTruthy();
  });

  it('shows past day view with snapshot points after pressing back', () => {
    const snapshots = [
      { periodStart: '2024-01-15T03:00:00.000Z', periodEnd: '2024-01-16T03:00:00.000Z', points: 47 },
    ];
    mockHistory({ snapshots });
    mockContext();
    render(<HomeScreen />);
    fireEvent.press(screen.getByTestId('nav-back'));
    expect(screen.getByTestId('past-points-display')).toHaveTextContent('47');
  });

  it('shows Today button in past view and returns to today on press', () => {
    const snapshots = [
      { periodStart: '2024-01-15T03:00:00.000Z', periodEnd: '2024-01-16T03:00:00.000Z', points: 10 },
    ];
    mockHistory({ snapshots });
    mockContext({ points: 5 });
    render(<HomeScreen />);
    fireEvent.press(screen.getByTestId('nav-back'));
    fireEvent.press(screen.getByTestId('nav-today'));
    expect(screen.getByTestId('points-display')).toHaveTextContent('5');
  });

  it('shows completed tasks for a past day', () => {
    const snapshots = [
      { periodStart: '2024-01-15T03:00:00.000Z', periodEnd: '2024-01-16T03:00:00.000Z', points: 5 },
    ];
    const allTasks = [
      {
        id: '1',
        name: 'Walk the dog',
        points: 5,
        createdAt: '2024-01-15T07:00:00.000Z',
        completedAt: '2024-01-15T10:00:00.000Z',
      },
    ];
    mockHistory({ snapshots, allTasks });
    mockContext();
    render(<HomeScreen />);
    fireEvent.press(screen.getByTestId('nav-back'));
    expect(screen.getByText('Walk the dog')).toBeTruthy();
  });
});
""")

# ============================================================
# 7. __tests__/useDailyPoints.test.ts — append snapshot tests
# ============================================================
dp_test_path = os.path.join(BASE, '__tests__', 'useDailyPoints.test.ts')
with open(dp_test_path, 'r', encoding='utf-8') as f:
    dp_test = f.read()

new_snapshot_tests = """
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
"""

# Insert before the last "})" which closes the describe block
idx = dp_test.rfind('});')
dp_test = dp_test[:idx] + new_snapshot_tests + dp_test[idx:]
with open(dp_test_path, 'w', encoding='utf-8') as f:
    f.write(dp_test)
print(f'Patched: __tests__/useDailyPoints.test.ts')

print('\nAll done!')
