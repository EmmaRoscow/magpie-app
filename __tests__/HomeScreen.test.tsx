import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { HomeScreen } from '../src/screens/HomeScreen';
import * as DailyPointsContextModule from '../src/context/DailyPointsContext';
import * as useHistoryModule from '../src/hooks/useHistory';
import { UseDailyPointsReturn } from '../src/hooks/useDailyPoints';


jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
}));
const baseHistory = { snapshots: [], allTasks: [], isLoading: false, refresh: jest.fn() };

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

  it('shows task-derived points for a past day after pressing back', () => {
    const snapshots = [
      { periodStart: '2024-01-15T03:00:00.000Z', periodEnd: '2024-01-16T03:00:00.000Z', points: 47 },
    ];
    const allTasks = [
      { id: '1', name: 'Big task', points: 47, createdAt: '2024-01-15T05:00:00.000Z', completedAt: '2024-01-15T10:00:00.000Z' },
    ];
    mockHistory({ snapshots, allTasks });
    mockContext({ lastResetISO: '2024-01-16T03:00:00.000Z' });
    render(<HomeScreen />);
    fireEvent.press(screen.getByTestId('nav-back'));
    expect(screen.getByTestId('past-points-display')).toHaveTextContent('47');
  });

  it('shows Today button in past view and returns to today on press', () => {
    const snapshots = [
      { periodStart: '2024-01-15T03:00:00.000Z', periodEnd: '2024-01-16T03:00:00.000Z', points: 10 },
    ];
    mockHistory({ snapshots });
    mockContext({ points: 5, lastResetISO: '2024-01-16T03:00:00.000Z' });
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
    mockContext({ lastResetISO: '2024-01-16T03:00:00.000Z' });
    render(<HomeScreen />);
    fireEvent.press(screen.getByTestId('nav-back'));
    expect(screen.getByText('Walk the dog')).toBeTruthy();
  });

  it('nav-back is disabled when no history exists', () => {
    mockContext({ lastResetISO: new Date().toISOString() });
    render(<HomeScreen />);
    fireEvent.press(screen.getByTestId('nav-back'));
    expect(screen.queryByTestId('past-points-display')).toBeNull();
    expect(screen.getByTestId('points-display')).toBeTruthy();
  });
});
