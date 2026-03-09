const React = require('react');
const { FlatList } = require('react-native');

const DraggableFlatList = React.forwardRef((props, ref) => {
  const {
    data, renderItem, keyExtractor, ListHeaderComponent, ListFooterComponent,
    ListEmptyComponent, contentContainerStyle, ItemSeparatorComponent, testID,
  } = props;
  return React.createElement(FlatList, {
    ref, data, keyExtractor, ListHeaderComponent, ListFooterComponent,
    ListEmptyComponent, contentContainerStyle, ItemSeparatorComponent, testID,
    renderItem: ({ item, index }) =>
      renderItem({ item, index, drag: jest.fn(), isActive: false }),
  });
});
DraggableFlatList.displayName = 'DraggableFlatList';

const ScaleDecorator = ({ children }) => children;
const OpacityDecorator = ({ children }) => children;
const ShadowDecorator = ({ children }) => children;

module.exports = DraggableFlatList;
module.exports.default = DraggableFlatList;
module.exports.ScaleDecorator = ScaleDecorator;
module.exports.OpacityDecorator = OpacityDecorator;
module.exports.ShadowDecorator = ShadowDecorator;
