import os

target = r'C:\Users\emmar\OneDrive\Documents\Coding\life-app\src\screens\TasksScreen.tsx'

content = """\
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDailyPointsContext } from '../context/DailyPointsContext';
import { useTasks } from '../hooks/useTasks';
import { AddTaskModal } from '../components/AddTaskModal';
import { Task } from '../types/task';

type SectionItem = { type: 'section'; id: string; label: string };
type ListItem = Task | SectionItem;

const COLORS = {
  background: '#1E1B4B',
  card: '#312E81',
  cardDone: '#252243',
  textPrimary: '#FFFFFF',
  textMuted: '#A5B4FC',
  textDone: '#6B6A8A',
  fab: '#6366F1',
  delete: '#F87171',
  separator: '#3730A3',
  uncheck: '#6366F1',
  checkDone: '#4B4870',
  checkDoneMark: '#7C7A9E',
  sectionHeader: '#7C7A9E',
};

export function TasksScreen() {
  const { adjustPoints, lastResetISO, isLoading: pointsLoading } = useDailyPointsContext();
  const { tasks, isLoading: tasksLoading, categories, addTask, completeTask, uncompleteTask, deleteTask } =
    useTasks(adjustPoints, lastResetISO);
  const [modalVisible, setModalVisible] = useState(false);

  const isLoading = pointsLoading || tasksLoading;

  const listData = useMemo<ListItem[]>(() => {
    const incomplete = tasks.filter((t) => !t.completedAt);
    const completed = tasks.filter((t) => !!t.completedAt);
    if (completed.length === 0) return incomplete;
    return [
      ...incomplete,
      { type: 'section', id: 'completed-header', label: 'Completed' } as SectionItem,
      ...completed,
    ];
  }, [tasks]);

  function confirmDelete(id: string, name: string) {
    Alert.alert(
      'Delete task',
      `Delete "${name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteTask(id) },
      ]
    );
  }

  function renderItem({ item }: { item: ListItem }) {
    if ('type' in item) {
      return (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderText}>{item.label}</Text>
        </View>
      );
    }

    const task = item as Task;
    const completed = !!task.completedAt;
    return (
      <View style={[styles.taskRow, completed && styles.taskRowDone]} testID={`task-row-${task.id}`}>
        <TouchableOpacity
          style={[styles.checkbox, completed && styles.checkboxDone]}
          onPress={() => completed ? uncompleteTask(task.id) : completeTask(task.id)}
          accessibilityLabel={completed ? 'Mark incomplete' : 'Mark complete'}
          accessibilityRole="checkbox"
          testID={`task-check-${task.id}`}
        >
          {completed && <Text style={styles.checkmark}>\u2713</Text>}
        </TouchableOpacity>

        <View style={styles.taskInfo}>
          <Text
            style={[styles.taskName, completed && styles.taskNameDone]}
            numberOfLines={2}
          >
            {task.name}
          </Text>
          {task.category ? (
            <Text style={[styles.taskCategory, completed && styles.taskCategoryDone]}>{task.category}</Text>
          ) : null}
        </View>

        <Text style={[styles.taskPoints, completed && styles.taskPointsDone]}>
          {task.points > 0 ? '+' : ''}{task.points}
        </Text>

        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => confirmDelete(task.id, task.name)}
          accessibilityLabel="Delete task"
          testID={`task-delete-${task.id}`}
        >
          <Text style={styles.deleteBtnText}>\u2715</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>Tasks</Text>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.textMuted} />
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={listData.length === 0 ? styles.emptyContainer : styles.listContent}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>No tasks yet.</Text>
              <Text style={styles.emptySubtext}>Tap + to add your first task.</Text>
            </View>
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          testID="task-list"
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
        accessibilityLabel="Add task"
        accessibilityRole="button"
        testID="fab-add"
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <AddTaskModal
        visible={modalVisible}
        existingCategories={categories}
        onAdd={addTask}
        onClose={() => setModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  heading: { fontSize: 28, fontWeight: '700', color: COLORS.textPrimary },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyContainer: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingBottom: 100 },
  emptyText: { fontSize: 18, fontWeight: '600', color: COLORS.textMuted, marginBottom: 6 },
  emptySubtext: { fontSize: 14, color: COLORS.textMuted },
  sectionHeader: { paddingHorizontal: 4, paddingTop: 16, paddingBottom: 6 },
  sectionHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.sectionHeader,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    marginVertical: 2,
  },
  taskRowDone: { backgroundColor: COLORS.cardDone },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.uncheck,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxDone: { backgroundColor: COLORS.checkDone, borderColor: COLORS.checkDone },
  checkmark: { color: COLORS.checkDoneMark, fontSize: 14, fontWeight: '700' },
  taskInfo: { flex: 1 },
  taskName: { fontSize: 16, fontWeight: '500', color: COLORS.textPrimary },
  taskNameDone: { textDecorationLine: 'line-through', color: COLORS.textDone },
  taskCategory: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  taskCategoryDone: { color: COLORS.textDone },
  taskPoints: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginHorizontal: 12,
    minWidth: 36,
    textAlign: 'right',
  },
  taskPointsDone: { color: COLORS.textDone },
  deleteBtn: { padding: 4 },
  deleteBtnText: { color: COLORS.delete, fontSize: 16, fontWeight: '700' },
  separator: { height: 4 },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 32,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.fab,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
  fabText: { color: '#FFFFFF', fontSize: 28, fontWeight: '300', lineHeight: 32 },
});
"""

with open(target, 'w', encoding='utf-8') as f:
    f.write(content)

print(f'Written {len(content.splitlines())} lines to {target}')
