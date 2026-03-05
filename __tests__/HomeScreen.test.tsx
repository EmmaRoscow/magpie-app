import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { HomeScreen } from '../src/screens/HomeScreen';
import * as useDailyPointsModule from '../src/hooks/useDailyPoints';

const mockIncrement = jest.fn();

function mockHook(
  overrides: Partial<useDailyPointsModule.UseDailyPointsReturn> = {}
) {
  jest.spyOn(useDailyPointsModule, 'useDailyPoints').mockReturnValue({
    points: 0,
    target: 100,
    isLoading: false,
    increment: mockIncrement,
    ...overrides,
  });
}

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the current points', () => {
    mockHook({ points: 42 });
    render(<HomeScreen />);
    expect(screen.getByTestId('points-display')).toHaveTextContent('42');
  });

  it('renders the daily target', () => {
    mockHook({ points: 0, target: 100 });
    render(<HomeScreen />);
    expect(screen.getByText('/ 100')).toBeTruthy();
  });

  it('renders the increment button label', () => {
    mockHook();
    render(<HomeScreen />);
    expect(screen.getByText('+ 1 Point')).toBeTruthy();
  });

  it('calls increment when the button is pressed', () => {
    mockHook({ points: 5 });
    render(<HomeScreen />);
    fireEvent.press(screen.getByTestId('increment-button'));
    expect(mockIncrement).toHaveBeenCalledTimes(1);
  });

  it('shows an activity indicator while loading', () => {
    mockHook({ isLoading: true });
    render(<HomeScreen />);
    expect(screen.queryByTestId('points-display')).toBeNull();
    expect(screen.queryByTestId('increment-button')).toBeNull();
  });

  it('shows content once loading is complete', () => {
    mockHook({ isLoading: false, points: 7 });
    render(<HomeScreen />);
    expect(screen.getByTestId('points-display')).toHaveTextContent('7');
    expect(screen.getByTestId('increment-button')).toBeTruthy();
  });

  it('button has correct accessibility role', () => {
    mockHook();
    render(<HomeScreen />);
    expect(
      screen.getByRole('button', { name: 'Add one point' })
    ).toBeTruthy();
  });
});
