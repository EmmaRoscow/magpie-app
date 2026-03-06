target = r'C:\Users\emmar\OneDrive\Documents\Coding\life-app\__tests__\TasksScreen.test.tsx'

with open(target, 'r', encoding='utf-8') as f:
    content = f.read()

# Add Alert import from react-native
old_import = "import React from 'react';\nimport { render, screen, fireEvent } from '@testing-library/react-native';"
new_import = "import React from 'react';\nimport { Alert } from 'react-native';\nimport { render, screen, fireEvent } from '@testing-library/react-native';"
content = content.replace(old_import, new_import)

# Replace the delete test
old_test = """  it('pressing delete calls deleteTask', () => {
    mockTasks([makeTask({ id: '42' })]);
    render(<TasksScreen />);
    fireEvent.press(screen.getByTestId('task-delete-42'));
    expect(mockDeleteTask).toHaveBeenCalledWith('42');
  });"""

new_test = """  it('pressing delete shows a confirmation alert and calls deleteTask on confirm', () => {
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
  });"""

content = content.replace(old_test, new_test)

with open(target, 'w', encoding='utf-8') as f:
    f.write(content)

print('Patched successfully')
