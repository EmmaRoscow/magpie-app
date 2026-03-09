import React, { useState, useRef, useMemo, useCallback } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
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

/** Snaps a Date back to the most recent 3 am boundary (local time). */
function snap3am(date: Date): Date {
  const result = new Date(date);
  result.setHours(3, 0, 0, 0);
  if (date < result) {
    // Before today's 3 am — use yesterday's 3 am.
    result.setDate(result.getDate() - 1);
  }
  return result;
}

export function HomeScreen() {
  const { points, target, isLoading: pointsLoading, lastResetISO } = useDailyPointsContext();
  const { snapshots, allTasks, isLoading: historyLoading, refresh } = useHistory();
  const [dayOffset, setDayOffset] = useState(0);

  // Refs keep PanResponder callbacks fresh without recreating the responder.
  const dayOffsetRef = useRef(0);
  const virtualDaysLenRef = useRef(0);
  dayOffsetRef.current = dayOffset;

  // Refresh history from AsyncStorage whenever this screen gains focus,
  // so backdating a task on TasksScreen is immediately reflected here.
  const hasMounted = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (!hasMounted.current) { hasMounted.current = true; return; }
      refresh();
    }, [refresh])
  );

  // Build one 3 am-to-3 am virtual period per calendar day, from the earliest
  // known date back to the start of the current period (lastResetISO).
  // Points are derived from tasks instead of snapshot.points so that backdating
  // a task (feature 4) automatically updates every historical day view.
  const virtualDays = useMemo(() => {
    const mss: number[] = [];
    for (const s of snapshots) mss.push(new Date(s.periodStart).getTime());
    for (const t of allTasks) if (t.completedAt) mss.push(new Date(t.completedAt).getTime());
    if (mss.length === 0) return [];

    const cursor = snap3am(new Date(Math.min(...mss)));
    const upTo   = snap3am(new Date(lastResetISO));
    if (cursor >= upTo) return [];

    const periods: Array<{ periodStart: string; periodEnd: string }> = [];
    const cur = new Date(cursor);
    while (cur < upTo) {
      const pStart = cur.toISOString();
      cur.setDate(cur.getDate() + 1);
      periods.push({ periodStart: pStart, periodEnd: (cur <= upTo ? cur : upTo).toISOString() });
    }
    return periods.reverse(); // index 0 = most recent past day
  }, [snapshots, allTasks, lastResetISO]);

  virtualDaysLenRef.current = virtualDays.length;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > Math.abs(gs.dy) && Math.abs(gs.dx) > 10,
      onPanResponderRelease: (_, gs) => {
        if (gs.dx > 50 && -dayOffsetRef.current < virtualDaysLenRef.current) {
          setDayOffset(dayOffsetRef.current - 1);
        } else if (gs.dx < -50 && dayOffsetRef.current < 0) {
          setDayOffset(dayOffsetRef.current + 1);
        }
      },
    })
  ).current;

  const isLoading   = pointsLoading || historyLoading;
  const isToday     = dayOffset === 0;
  const currentDay  = !isToday ? (virtualDays[-dayOffset - 1] ?? null) : null;
  const canGoBack   = -dayOffset < virtualDays.length;
  const canGoForward = dayOffset < 0;

  // Tasks completed during the current past day, sorted chronologically.
  const dayTasks = useMemo(() => {
    if (!currentDay) return [];
    return allTasks
      .filter(
        (t) =>
          t.completedAt &&
          t.completedAt >= currentDay.periodStart &&
          t.completedAt <  currentDay.periodEnd
      )
      .sort((a, b) => (a.completedAt! < b.completedAt! ? -1 : 1));
  }, [currentDay, allTasks]);

  const dayPoints = useMemo(
    () => dayTasks.reduce((sum, t) => sum + t.points, 0),
    [dayTasks]
  );

  const dateLabel = isToday
    ? 'Today'
    : currentDay
    ? formatPeriodDate(currentDay.periodStart)
    : '\u2014'; // em dash

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
          <Text style={[styles.navArrow, !canGoBack && styles.navArrowDisabled]}>{String.fromCharCode(8249)}</Text>
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
            <Text style={[styles.navArrow, !canGoForward && styles.navArrowDisabled]}>{String.fromCharCode(8250)}</Text>
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
        ) : currentDay ? (
          <ScrollView
            contentContainerStyle={styles.pastContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.pastPointsLabel}>Points earned</Text>
            <Text style={styles.pastPoints} testID="past-points-display">
              {dayPoints}
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
  container:        { flex: 1, backgroundColor: COLORS.background },
  containerPast:    { backgroundColor: COLORS.backgroundPast },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.navBorder,
  },
  navBtn:          { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  navArrow:        { fontSize: 32, color: COLORS.textMuted, lineHeight: 36 },
  navArrowDisabled:{ color: COLORS.navBtnDisabled },
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
  swipeArea:    { flex: 1 },
  todayContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textMuted,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 24,
  },
  scoreRow: { flexDirection: 'row', alignItems: 'flex-end' },
  points:   { fontSize: 96, fontWeight: '700', color: COLORS.textPrimary, lineHeight: 104 },
  target:   { fontSize: 32, fontWeight: '400', color: COLORS.textMuted, marginBottom: 12, marginLeft: 8 },
  pastContent: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 40 },
  pastPointsLabel: {
    fontSize: 13, fontWeight: '600', color: COLORS.textMuted,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8,
  },
  pastPoints: {
    fontSize: 80, fontWeight: '700', color: COLORS.textPrimary,
    lineHeight: 88, marginBottom: 40,
  },
  pastSectionLabel: {
    fontSize: 13, fontWeight: '600', color: COLORS.textMuted,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12,
  },
  pastTask:         { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.pastTaskBg, borderRadius: 10, padding: 12, marginBottom: 8 },
  pastTaskInfo:     { flex: 1 },
  pastTaskName:     { fontSize: 15, fontWeight: '500', color: COLORS.textPrimary },
  pastTaskCategory: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  pastTaskPoints:   { fontSize: 14, fontWeight: '700', color: COLORS.textMuted },
});
