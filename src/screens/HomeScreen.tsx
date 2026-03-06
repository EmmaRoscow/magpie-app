import React, { useState, useRef, useMemo } from 'react';
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
    : '—';

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
          <Text style={[styles.navArrow, !canGoBack && styles.navArrowDisabled]}>‹</Text>
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
            <Text style={[styles.navArrow, !canGoForward && styles.navArrowDisabled]}>›</Text>
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
