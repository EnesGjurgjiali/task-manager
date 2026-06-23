import React from 'react';
import { Modal, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Task } from '@/types/task';

interface TaskOptionsModalProps {
  visible: boolean;
  task: Task | null;
  onClose: () => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

export function TaskOptionsModal({ visible, task, onClose, onEdit, onDelete }: TaskOptionsModalProps) {
  const theme = useTheme();

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={[styles.optionsCard, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
          <ThemedText type="subtitle" style={styles.optionsTitle}>
            Task Options
          </ThemedText>
          <ThemedView style={styles.optionsList}>
            <Pressable
              style={({ pressed }) => [
                styles.optionButton,
                pressed && { backgroundColor: theme.backgroundSelected }
              ]}
              onPress={() => {
                onClose();
                if (task) onEdit(task);
              }}
            >
              <ThemedView style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' }}>
                <Ionicons name="pencil" size={20} color={theme.text} style={styles.optionIcon} />
                <ThemedText type="smallBold">Edit Task</ThemedText>
              </ThemedView>
            </Pressable>

            <ThemedView style={[styles.optionsDivider, { backgroundColor: theme.backgroundSelected }]} />

            <Pressable
              style={({ pressed }) => [
                styles.optionButton,
                pressed && { backgroundColor: theme.backgroundSelected }
              ]}
              onPress={() => {
                onClose();
                if (task) onDelete(task._id);
              }}
            >
              <ThemedView style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' }}>
                <Ionicons name="trash" size={20} color="#ef4444" style={styles.optionIcon} />
                <ThemedText type="smallBold" style={{ color: '#ef4444' }}>Delete Task</ThemedText>
              </ThemedView>
            </Pressable>
          </ThemedView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: Spacing.four,
  },
  optionsCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: Spacing.four,
    borderWidth: 1,
    padding: Spacing.six,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  optionsTitle: {
    marginBottom: Spacing.four,
    textAlign: 'center',
  },
  optionsList: {
    backgroundColor: 'transparent',
  },
  optionButton: {
    paddingVertical: Spacing.five,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.two,
  },
  optionIcon: {
    marginRight: Spacing.four,
    width: 24,
    textAlign: 'center',
  },
  optionsDivider: {
    height: 1,
    marginVertical: Spacing.three,
  },
});
