const React = require('react');
const { View } = require('react-native');

const DateTimePicker = (props) =>
  React.createElement(View, { testID: props.testID || 'date-time-picker' });
DateTimePicker.displayName = 'DateTimePicker';

module.exports = DateTimePicker;
module.exports.default = DateTimePicker;
