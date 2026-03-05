import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useDailyPoints } from '../hooks/useDailyPoints';

const COLORS = {
  background: '#4F46E5', // indigo-600
  textPrimary: '#FFFFFF',
  textMuted: '#C7D2FE',  // indigo-200
  button: '#FFFFFF',
  buttonText: '#4F46E5', // indigo-600
};

export function HomeScreen() {
  const { points, target, isLoading, increment } = useDailyPoints();

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

        <TouchableOpacity
          style={styles.button}
          onPress={increment}
          activeOpacity={0.8}
          testID="increment-button"
          accessibilityLabel="Add one point"
          accessibilityRole="button"
        >
          <Text style={styles.buttonText}>+ 1 Point</Text>
        </TouchableOpacity>
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
    marginBottom: 48,
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
  button: {
    backgroundColor: COLORS.button,
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 32,
    elevation: 6,
  },
  buttonText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.buttonText,
    letterSpacing: 0.5,
  },
});
