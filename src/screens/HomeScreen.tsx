import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useDailyPointsContext } from '../context/DailyPointsContext';

const COLORS = {
  background: '#312E81', // indigo-900
  textPrimary: '#FFFFFF',
  textMuted: '#A5B4FC',  // indigo-300
};

export function HomeScreen() {
  const { points, target, isLoading } = useDailyPointsContext();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.textPrimary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.label}>Daily Points</Text>

        <View style={styles.scoreRow}>
          <Text style={styles.points} testID="points-display">
            {points}
          </Text>
          <Text style={styles.target}>/ {target}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
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
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  points: {
    fontSize: 96,
    fontWeight: '700',
    color: COLORS.textPrimary,
    lineHeight: 104,
  },
  target: {
    fontSize: 32,
    fontWeight: '400',
    color: COLORS.textMuted,
    marginBottom: 12,
    marginLeft: 8,
  },
});
