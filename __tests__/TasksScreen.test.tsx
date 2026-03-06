import React from 'react';
import { Alert } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { TasksScreen } from '../src/screens/TasksScreen';
import * as DailyPointsContextModule from '../src/context/DailyPointsContext';
import * as useTasksModule from '../src/hooks/useTasks';

const mockAdjustPoints = jest.fn();
const baseContext = {
  points: 5,
  target: 100,
  isLoading: false,
  lastResetISO: '2024-01-16T09:00:00.000Z',
  adjustPoints: mockAdjustPoints,
};

const mockCompleteTask = jest.fn();
const mockUncompleteTask = jest.fn();
const mockDeleteTask = jest.fn();
const mockAddTask = jest.fn();

function mockTasks(tasks = []) {
  jest.spyOn(useTasksModule, 'useTasks').mockReturnValue({
    tasks,
    isLoading: false,
    categories: [],
    addTask: mockAddTask,
    completeTask: mockCompleteTask,
    uncompleteTask: mockUncompleteTask,
    deleteTask: mockDeleteTask,
  });
}

function mockCtx(overrides = {}) {
  jest.spyOn(DailyPointsContextModule, 'useDailyPointsContext').mockReturnValue(
    { ...baseContext, ...overrides }
  );
}

function makeTask(overrides = {}) {
  return {
    id: '1',
    name: 'Test task',
    points: 3,
    createdAt: '2024-01-16T07:00:00.000Z',
    ...overrides,
  };
}

describe('TasksScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCtx();
  });

  it('renders empty state when there are no tasks', () => {
    mockTasks([]);
    render(<TasksScreen />);
    expect(screen.getByText('No tasks yet.')).toBeTruthy();
  });

  it('renders a task in the list', () => {
    mockTasks([makeTask({ name: 'Buy groceries' })]);
    render(<TasksScreen />);
    expect(screen.getByText('Buy groceries')).toBeTruthy();
  });

  it('renders task with category', () => {
    mockTasks([makeTask({ category: 'Health' })]);
    render(<TasksScreen />);
    expect(screen.getByText('Health')).toBeTruthy();
  });

  it('renders completed task with struck-through style', () => {
    mockTasks([makeTask({ completedAt: '2024-01-16T10:00:00.000Z' })]);
    render(<TasksScreen />);
    const name = screen.getByText('Test task');
    const style = name.props.style;
    const flatStyle = Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style;
    expect(flatStyle.textDecorationLine).toBe('line-through');
  });

  it('pressing the FAB opens the add task modal', () => {
    mockTasks([]);
    render(<TasksScreen />);
    fireEvent.press(screen.getByTestId('fab-add'));
    expect(screen.getByTestId('input-name')).toBeTruthy();
  });

  it('pressing the checkbox calls completeTask for an incomplete task', () => {
    mockTasks([makeTask({ id: '42' })]);
    render(<TasksScreen />);
    fireEvent.press(screen.getByTestId('task-check-42'));
    expect(mockCompleteTask).toHaveBeenCalledWith('42');
  });

  it('pressing the checkbox calls uncompleteTask for a completed task', () => {
    mockTasks([makeTask({ id: '42', completedAt: '2024-01-16T10:00:00.000Z' })]);
    render(<TasksScreen />);
    fireEvent.press(screen.getByTestId('task-check-42'));
    expect(mockUncompleteTask).toHaveBeenCalledWith('42');
  });

  it('pressing delete shows a confirmation alert and calls deleteTask on confirm', () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    mockTasks([makeTask({ id: '42', name: 'Test task' })]);
    render(<TasksScreen />);
    fireEvent.press(screen.getByTestId('task-delete-42'));
    expect(alertSpy).toHaveBeenCalledWith(
      'Delete task',
      'Delete "Test task"?',
      expect.any(Array)
    );
    const buttons: any[] = alertSpy.mock.calls[0][2];
    const deleteBtn = buttons.find((b) => b.text === 'Delete');
    deleteBtn.onPress();
    expect(mockDeleteTask).toHaveBeenCalledWith('42');
  });

  it('shows loading indicator while loading', () => {
    mockCtx({ isLoading: true });
    mockTasks([]);
    render(<TasksScreen />);
    expect(screen.queryByTestId('task-list')).toBeNull();
    expect(screen.queryByTestId('fab-add')).toBeTruthy();
  });
});
