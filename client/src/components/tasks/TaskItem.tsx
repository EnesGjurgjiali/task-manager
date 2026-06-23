import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RenderItemParams } from 'react-native-draggable-flatlist';

import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Task } from '@/types/task';

interface TaskItemProps extends RenderItemParams<Task> {
  selectedTask: Task | null;
  onSelectTask: (task: Task | null) => void;
  onToggleStatus: (task: Task) => void;
  onOpenOptions: (task: Task) => void;
}

export function TaskItem({
  item,
  drag,
  isActive,
  selectedTask,
  onSelectTask,
  onToggleStatus,
  onOpenOptions,
}: TaskItemProps) {
  const theme = useTheme();
  const isCompleted = item.status === 'completed';

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#3b82f6';
      default: return '#9ca3af';
    }
  };

  return (
    <Pressable 
      onLongPress={drag}
      disabled={isActive}
      onPress={() => onSelectTask(selectedTask?._id === item._id ? null : item)}
      style={[
        styles.taskItem, 
        { backgroundColor: isActive ? theme.backgroundSelected : theme.backgroundElement, borderColor: theme.backgroundSelected },
        isActive && { transform: [{ scale: 1.02 }], elevation: 5, zIndex: 99 }
      ]}
    >
      <ThemedView style={styles.taskRow}>
        <Pressable 
          onPress={() => onToggleStatus(item)}
          style={[
            styles.checkbox, 
            { borderColor: theme.text },
            isCompleted && { backgroundColor: theme.text }
          ]}
        >
          {isCompleted && <ThemedView style={[styles.checkboxInner, { backgroundColor: theme.background }]} />}
        </Pressable>
        
        <ThemedView style={{ flex: 1, backgroundColor: 'transparent' }}>
          <ThemedText 
            style={[
              styles.taskTitle, 
              isCompleted && { textDecorationLine: 'line-through', opacity: 0.6 }
            ]}
          >
            {item.title}
          </ThemedText>
          
          <ThemedView style={[styles.priorityBadge, { borderColor: getPriorityColor(item.priority) }]}>
            <ThemedText type="smallBold" style={{ color: getPriorityColor(item.priority), fontSize: 10 }}>
              {item.priority?.toUpperCase() || 'MEDIUM'}
            </ThemedText>
          </ThemedView>
          {item.dueDate && (
            <ThemedView style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, backgroundColor: 'transparent' }}>
              <Ionicons 
                name="time-outline" 
                size={12} 
                color={!isCompleted && new Date(item.dueDate) < new Date() ? '#ef4444' : theme.textSecondary} 
                style={{ marginRight: 4 }} 
              />
              <ThemedText 
                type="small" 
                style={{ 
                  fontSize: 10, 
                  color: !isCompleted && new Date(item.dueDate) < new Date() ? '#ef4444' : theme.textSecondary 
                }}
              >
                {new Date(item.dueDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
              </ThemedText>
            </ThemedView>
          )}
        </ThemedView>
        
        <Pressable onPress={() => onOpenOptions(item)} style={styles.deleteButton} hitSlop={10}>
          <Ionicons name="ellipsis-vertical" size={20} color={theme.textSecondary} />
        </Pressable>
      </ThemedView>

      {selectedTask?._id === item._id && (
        <ThemedView style={[styles.taskDetails, { borderTopWidth: 1, borderTopColor: theme.backgroundSelected }]}>
          <ThemedText type="small" style={styles.taskDescription} themeColor="textSecondary">
            {item.description || 'No description provided.'}
          </ThemedText>
          <ThemedText type="code" style={styles.taskDate} themeColor="textSecondary">
            Created: {new Date(item.createdDate).toLocaleDateString()}
          </ThemedText>
        </ThemedView>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  taskItem: {
    padding: Spacing.four,
    marginBottom: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    marginRight: Spacing.four,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  priorityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
  },
  deleteButton: {
    padding: Spacing.two,
    marginLeft: Spacing.two,
  },
  taskDetails: {
    marginTop: Spacing.four,
    paddingTop: Spacing.four,
    backgroundColor: 'transparent',
  },
  taskDescription: {
    marginBottom: Spacing.two,
    lineHeight: 20,
  },
  taskDate: {
    fontSize: 12,
  },
});
