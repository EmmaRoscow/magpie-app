import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';

interface Props {
  visible: boolean;
  existingCategories: string[];
  onAdd: (name: string, points: number, category?: string) => void;
  onClose: () => void;
}

const COLORS = {
  overlay: 'rgba(0,0,0,0.6)',
  card: '#1E1B4B',
  input: '#312E81',
  border: '#4338CA',
  textPrimary: '#FFFFFF',
  textMuted: '#A5B4FC',
  chip: '#312E81',
  chipBorder: '#6366F1',
  buttonPrimary: '#6366F1',
  buttonSecondary: '#312E81',
  error: '#F87171',
};

export function AddTaskModal({ visible, existingCategories, onAdd, onClose }: Props) {
  const [name, setName] = useState('');
  const [pointsText, setPointsText] = useState('2');
  const [category, setCategory] = useState('');
  const [categoryFocused, setCategoryFocused] = useState(false);
  const [nameError, setNameError] = useState('');
  const [pointsError, setPointsError] = useState('');

  const filteredCategories = existingCategories.filter(
    (c) => c.toLowerCase().includes(category.toLowerCase()) && c !== category
  );

  function reset() {
    setName('');
    setPointsText('2');
    setCategory('');
    setCategoryFocused(false);
    setNameError('');
    setPointsError('');
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleAdd() {
    let valid = true;

    if (!name.trim()) {
      setNameError('Task name is required.');
      valid = false;
    } else {
      setNameError('');
    }

    const parsedPoints = parseInt(pointsText, 10);
    if (pointsText.trim() === '' || isNaN(parsedPoints)) {
      setPointsError('Points must be an integer.');
      valid = false;
    } else {
      setPointsError('');
    }

    if (!valid) return;

    onAdd(name.trim(), parsedPoints, category.trim() || undefined);
    reset();
    onClose();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />
        <View style={styles.card}>
          <Text style={styles.title}>New Task</Text>

          {/* Name */}
          <Text style={styles.label}>Task name *</Text>
          <TextInput
            style={[styles.input, nameError ? styles.inputError : null]}
            placeholder="e.g. Go for a walk"
            placeholderTextColor={COLORS.textMuted}
            value={name}
            onChangeText={setName}
            returnKeyType="next"
            testID="input-name"
          />
          {nameError ? <Text style={styles.error}>{nameError}</Text> : null}

          {/* Points */}
          <Text style={styles.label}>Points</Text>
          <TextInput
            style={[styles.input, pointsError ? styles.inputError : null]}
            placeholder="2"
            placeholderTextColor={COLORS.textMuted}
            value={pointsText}
            onChangeText={setPointsText}
            keyboardType="numeric"
            returnKeyType="next"
            testID="input-points"
          />
          {pointsError ? <Text style={styles.error}>{pointsError}</Text> : null}

          {/* Category */}
          <Text style={styles.label}>Category (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Health"
            placeholderTextColor={COLORS.textMuted}
            value={category}
            onChangeText={setCategory}
            onFocus={() => setCategoryFocused(true)}
            onBlur={() => setTimeout(() => setCategoryFocused(false), 150)}
            returnKeyType="done"
            testID="input-category"
          />

          {categoryFocused && filteredCategories.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chips}
              keyboardShouldPersistTaps="always"
            >
              {filteredCategories.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={styles.chip}
                  onPress={() => setCategory(c)}
                >
                  <Text style={styles.chipText}>{c}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.btnSecondary} onPress={handleClose} testID="btn-cancel">
              <Text style={styles.btnSecondaryText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnPrimary} onPress={handleAdd} testID="btn-add">
              <Text style={styles.btnPrimaryText}>Add Task</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.overlay,
  },
  card: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  input: {
    backgroundColor: COLORS.input,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: COLORS.textPrimary,
    fontSize: 16,
    marginBottom: 16,
  },
  inputError: {
    borderColor: COLORS.error,
    marginBottom: 4,
  },
  error: {
    color: COLORS.error,
    fontSize: 13,
    marginBottom: 12,
  },
  chips: {
    marginBottom: 16,
  },
  chip: {
    backgroundColor: COLORS.chip,
    borderWidth: 1,
    borderColor: COLORS.chipBorder,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  chipText: {
    color: COLORS.textPrimary,
    fontSize: 14,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  btnPrimary: {
    flex: 1,
    backgroundColor: COLORS.buttonPrimary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  btnSecondary: {
    flex: 1,
    backgroundColor: COLORS.buttonSecondary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnSecondaryText: {
    color: COLORS.textMuted,
    fontSize: 16,
    fontWeight: '600',
  },
});
