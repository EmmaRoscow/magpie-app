import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { HomeScreen } from '../src/screens/HomeScreen';
import * as DailyPointsContextModule from '../src/context/DailyPointsContext';

function mockContext(
  overrides: Partial<DailyPointsContextModule.UseDailyPointsReturn> = {}
) {
  jest.spyOn(DailyPointsContextModule, 'useDailyPointsContext').mockReturnValue({
    points: 0,
    target: 100,
    isLoading: false,
    lastResetISO: new Date().toISOString(),
    adjustPoints: jest.fn(),
    ...overrides,
  });
}

// Re-export the return type so the mock helper can reference it
import { UseDailyPointsReturn } from '../src/hooks/useDailyPoints';

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
});
