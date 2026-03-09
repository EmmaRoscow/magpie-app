import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useDailyPointsContext } from '../context/DailyPointsContext';
import { useTasks } from '../hooks/useTasks';
import { AddTaskModal } from '../components/AddTaskModal';
import { Task } from '../types/task';

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
  const {
    tasks,
    isLoading: tasksLoading,
    categories,
    addTask,
    completeTask,
    uncompleteTask,
    deleteTask,
    reorderIncompleteTasks,
    setTaskCompletedAt,
  } = useTasks(adjustPoints, lastResetISO);
  const [modalVisible, setModalVisible] = useState(false);
  const [datePickerTaskId, setDatePickerTaskId] = useState<string | null>(null);

  const isLoading = pointsLoading || tasksLoading;

  const incompleteTasks = useMemo(
    () => tasks.filter((t) => !t.completedAt),
    [tasks]
  );

  const todayCompletedTasks = useMemo(
    () => tasks.filter((t) => !!t.completedAt && t.completedAt > lastResetISO),
    [tasks, lastResetISO]
  );

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

  function onDatePickerChange(event: DateTimePickerEvent, selectedDate?: Date) {
    const taskId = datePickerTaskId;
    setDatePickerTaskId(null);
    if (event.type === 'dismissed' || !selectedDate || !taskId) return;
    const noon = new Date(selectedDate);
    noon.setHours(12, 0, 0, 0);
    setTaskCompletedAt(taskId, noon.toISOString());
  }

  function renderIncompleteItem({ item, drag, isActive }: RenderItemParams<Task>) {
    return (
      <ScaleDecorator>
        <View style={[styles.taskRow, isActive && styles.taskRowDragging]} testID={`task-row-${item.id}`}>
          <TouchableOpacity
            style={styles.checkbox}
            onPress={() => completeTask(item.id)}
            accessibilityLabel="Mark complete"
            accessibilityRole="checkbox"
            testID={`task-check-${item.id}`}
          />
          <TouchableOpacity style={styles.taskInfo} onLongPress={drag} delayLongPress={300}>
            <Text style={styles.taskName} numberOfLines={2}>{item.name}</Text>
            {item.category ? <Text style={styles.taskCategory}>{item.category}</Text> : null}
          </TouchableOpacity>
          <Text style={styles.taskPoints}>{item.points > 0 ? '+' : ''}{item.points}</Text>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => confirmDelete(item.id, item.name)}
            accessibilityLabel="Delete task"
            testID={`task-delete-${item.id}`}
          >
            <Text style={styles.deleteBtnText}>✕</Text>
          </TouchableOpacity>
        </View>
      </ScaleDecorator>
    );
  }
  const completedSection = todayCompletedTasks.length > 0 ? (
    <View>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionHeaderText}>Completed</Text>
      </View>
      {todayCompletedTasks.map((task) => (
        <View key={task.id} style={[styles.taskRow, styles.taskRowDone]} testID={`task-row-${task.id}`}>
          <TouchableOpacity
            style={[styles.checkbox, styles.checkboxDone]}
            onPress={() => uncompleteTask(task.id)}
            accessibilityLabel="Mark incomplete"
            accessibilityRole="checkbox"
            testID={`task-check-${task.id}`}
          >
            <Text style={styles.checkmark}>✓</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.taskInfo}
            onLongPress={() => setDatePickerTaskId(task.id)}
            delayLongPress={400}
          >
            <Text style={[styles.taskName, styles.taskNameDone]} numberOfLines={2}>{task.name}</Text>
            {task.category ? <Text style={[styles.taskCategory, styles.taskCategoryDone]}>{task.category}</Text> : null}
          </TouchableOpacity>
          <Text style={[styles.taskPoints, styles.taskPointsDone]}>{task.points > 0 ? '+' : ''}{task.points}</Text>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => confirmDelete(task.id, task.name)}
            accessibilityLabel="Delete task"
            testID={`task-delete-${task.id}`}
          >
            <Text style={styles.deleteBtnText}>✕</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  ) : null;

  const isEmpty = incompleteTasks.length === 0 && todayCompletedTasks.length === 0;
  const datePickerTask = datePickerTaskId ? tasks.find((t) => t.id === datePickerTaskId) : null;

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
        <DraggableFlatList
          data={incompleteTasks}
          keyExtractor={(item) => item.id}
          renderItem={renderIncompleteItem}
          onDragEnd={({ data }) => reorderIncompleteTasks(data)}
          contentContainerStyle={isEmpty ? styles.emptyContainer : styles.listContent}
          ListFooterComponent={completedSection}
          ListEmptyComponent={isEmpty ? (
            <View style={styles.centered}>
              <Text style={styles.emptyText}>No tasks yet.</Text>
              <Text style={styles.emptySubtext}>Tap + to add your first task.</Text>
            </View>
          ) : null}
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
      {datePickerTask && (
        <DateTimePicker
          value={new Date(datePickerTask.completedAt!)}
          mode="date"
          display="default"
          onChange={onDatePickerChange}
          maximumDate={new Date()}
          testID="date-time-picker"
        />
      )}
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
  sectionHeaderText: { fontSize: 12, fontWeight: '600', color: COLORS.sectionHeader, textTransform: 'uppercase', letterSpacing: 1 },
  taskRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 12, padding: 14, marginVertical: 2 },
  taskRowDone: { backgroundColor: COLORS.cardDone },
  taskRowDragging: { opacity: 0.8, elevation: 8 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: COLORS.uncheck, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  checkboxDone: { backgroundColor: COLORS.checkDone, borderColor: COLORS.checkDone },
  checkmark: { color: COLORS.checkDoneMark, fontSize: 14, fontWeight: '700' },
  taskInfo: { flex: 1 },
  taskName: { fontSize: 16, fontWeight: '500', color: COLORS.textPrimary },
  taskNameDone: { textDecorationLine: 'line-through', color: COLORS.textDone },
  taskCategory: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  taskCategoryDone: { color: COLORS.textDone },
  taskPoints: { fontSize: 15, fontWeight: '700', color: COLORS.textMuted, marginHorizontal: 12, minWidth: 36, textAlign: 'right' },
  taskPointsDone: { color: COLORS.textDone },
  deleteBtn: { padding: 4 },
  deleteBtnText: { color: COLORS.delete, fontSize: 16, fontWeight: '700' },
  separator: { height: 4 },
  fab: { position: 'absolute', right: 24, bottom: 32, width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.fab, alignItems: 'center', justifyContent: 'center', elevation: 6 },
  fabText: { color: '#FFFFFF', fontSize: 28, fontWeight: '300', lineHeight: 32 },
});
