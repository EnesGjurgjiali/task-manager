import React, { useState, useEffect } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Task } from '@/types/task';

interface TaskModalProps {
  visible: boolean;
  editingTask: Task | null;
  isPending: boolean;
  onSave: (data: { title: string; description: string; priority: 'low' | 'medium' | 'high'; dueDate: Date | null }) => void;
  onCancel: () => void;
}

export function TaskModal({ visible, editingTask, isPending, onSave, onCancel }: TaskModalProps) {
  const theme = useTheme();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (visible) {
      if (editingTask) {
        setTitle(editingTask.title);
        setDescription(editingTask.description || '');
        setPriority(editingTask.priority);
        setDueDate(editingTask.dueDate ? new Date(editingTask.dueDate) : null);
      } else {
        setTitle('');
        setDescription('');
        setPriority('medium');
        setDueDate(null);
      }
      setShowDatePicker(false);
    }
  }, [visible, editingTask]);

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onCancel}
    >
      <ThemedView style={styles.modalContainer}>
        <ThemedView style={[styles.modalContent, { backgroundColor: theme.background, borderColor: theme.backgroundSelected }]}>
          <ThemedText type="subtitle" style={styles.modalTitle}>
            {editingTask ? 'Edit Task' : 'New Task'}
          </ThemedText>

          <TextInput
            style={[styles.modalInput, { color: theme.text, borderColor: theme.backgroundSelected, backgroundColor: theme.backgroundElement }]}
            placeholder="Task Title"
            placeholderTextColor={theme.textSecondary}
            value={title}
            onChangeText={setTitle}
          />

          <TextInput
            style={[styles.modalInput, styles.textArea, { color: theme.text, borderColor: theme.backgroundSelected, backgroundColor: theme.backgroundElement }]}
            placeholder="Description"
            placeholderTextColor={theme.textSecondary}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />

          <ThemedView style={styles.prioritySelector}>
            <ThemedText type="smallBold" style={{ marginBottom: Spacing.two }}>Priority</ThemedText>
            <ThemedView style={styles.priorityButtons}>
              {(['low', 'medium', 'high'] as const).map(p => (
                <Pressable
                  key={p}
                  onPress={() => setPriority(p)}
                  style={[
                    styles.priorityButton,
                    { borderColor: theme.backgroundSelected },
                    priority === p && { backgroundColor: theme.text }
                  ]}
                >
                  <ThemedText 
                    type="small" 
                    style={[
                      { textTransform: 'capitalize' },
                      priority === p && { color: theme.background }
                    ]}
                  >
                    {p}
                  </ThemedText>
                </Pressable>
              ))}
            </ThemedView>
          </ThemedView>

          <ThemedView style={{ marginBottom: Spacing.four, backgroundColor: 'transparent' }}>
            <ThemedText type="smallBold" style={{ marginBottom: Spacing.two }}>Due Date</ThemedText>
            {Platform.OS === 'web' ? (
              <input 
                type="datetime-local" 
                value={dueDate ? new Date(dueDate.getTime() - dueDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                onChange={(e) => setDueDate(e.target.value ? new Date(e.target.value) : null)}
                style={{ padding: 8, borderRadius: 8, border: '1px solid #ccc', backgroundColor: theme.backgroundElement, color: theme.text }}
              />
            ) : (
              <ThemedView style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'transparent' }}>
                <Pressable 
                  onPress={() => setShowDatePicker(true)}
                  style={[styles.modalInput, { flex: 1, marginBottom: 0, justifyContent: 'center' }]}
                >
                  <ThemedText style={{ color: dueDate ? theme.text : theme.textSecondary }}>
                    {dueDate ? dueDate.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Select Due Date...'}
                  </ThemedText>
                </Pressable>
                {dueDate && (
                  <Pressable onPress={() => setDueDate(null)} style={{ padding: Spacing.two }}>
                    <Ionicons name="close-circle" size={24} color={theme.textSecondary} />
                  </Pressable>
                )}
              </ThemedView>
            )}
            {showDatePicker && Platform.OS !== 'web' && (
              <DateTimePicker
                value={dueDate || new Date()}
                mode={Platform.OS === 'ios' ? 'datetime' : 'date'}
                display="default"
                onValueChange={(event, date) => {
                  setShowDatePicker(Platform.OS === 'ios');
                  if (date) setDueDate(date);
                }}
                onDismiss={() => setShowDatePicker(false)}
              />
            )}
          </ThemedView>

          <ThemedView style={styles.modalButtons}>
            <Pressable
              onPress={onCancel}
              style={[styles.modalButton, { borderColor: theme.backgroundSelected }]}
            >
              <ThemedText type="small">Cancel</ThemedText>
            </Pressable>
            
            <Pressable
              onPress={() => onSave({ title, description, priority, dueDate })}
              disabled={isPending}
              style={[styles.modalButton, { backgroundColor: theme.text }]}
            >
              {isPending ? (
                <ActivityIndicator color={theme.background} />
              ) : (
                <ThemedText type="smallBold" style={{ color: theme.background }}>
                  Save
                </ThemedText>
              )}
            </Pressable>
          </ThemedView>
        </ThemedView>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  modalContent: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    padding: Spacing.four,
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  modalTitle: {
    marginBottom: Spacing.six,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    padding: Spacing.four,
    marginBottom: Spacing.four,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  prioritySelector: {
    marginBottom: Spacing.six,
    backgroundColor: 'transparent',
  },
  priorityButtons: {
    flexDirection: 'row',
    gap: Spacing.two,
    backgroundColor: 'transparent',
  },
  priorityButton: {
    flex: 1,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Spacing.two,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.two,
    backgroundColor: 'transparent',
  },
  modalButton: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderWidth: 1,
    borderRadius: Spacing.two,
  },
});
