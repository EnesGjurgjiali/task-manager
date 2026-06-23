import React, { useState, useEffect } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, Platform, ActivityIndicator, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useQuery } from '@tanstack/react-query';

import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/services/api';

interface User {
  _id: string;
  name: string;
  email: string;
}

interface AssignedUser {
  user: string;
  role: 'viewer' | 'editor';
}

interface CreateGroupTaskModalProps {
  visible: boolean;
  editingTask: any | null;
  isPending: boolean;
  onSave: (data: { title: string; description: string; priority: 'low' | 'medium' | 'high'; dueDate: Date | null; isGroupTask: boolean; assignedUsers: AssignedUser[] }) => void;
  onCancel: () => void;
}

export function CreateGroupTaskModal({ visible, editingTask, isPending, onSave, onCancel }: CreateGroupTaskModalProps) {
  const theme = useTheme();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [assignedUsers, setAssignedUsers] = useState<AssignedUser[]>([]);

  // Fetch all users to select from
  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await api.get('/users');
      return response.data;
    },
    enabled: visible,
  });

  useEffect(() => {
    if (visible) {
      if (editingTask) {
        setTitle(editingTask.title);
        setDescription(editingTask.description || '');
        setPriority(editingTask.priority);
        setDueDate(editingTask.dueDate ? new Date(editingTask.dueDate) : null);
        setAssignedUsers(
          editingTask.assignedUsers?.map((au: any) => ({
            user: au.user._id || au.user,
            role: au.role,
          })) || []
        );
      } else {
        setTitle('');
        setDescription('');
        setPriority('medium');
        setDueDate(null);
        setAssignedUsers([]);
      }
      setShowDatePicker(false);
    }
  }, [visible, editingTask]);

  const toggleUserSelection = (userId: string) => {
    setAssignedUsers(prev => {
      const isSelected = prev.find(u => u.user === userId);
      if (isSelected) {
        return prev.filter(u => u.user !== userId);
      } else {
        return [...prev, { user: userId, role: 'viewer' }];
      }
    });
  };

  const setRole = (userId: string, role: 'viewer' | 'editor') => {
    setAssignedUsers(prev => prev.map(u => u.user === userId ? { ...u, role } : u));
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onCancel}
    >
      <ThemedView style={styles.modalContainer}>
        <ThemedView style={[styles.modalContent, { backgroundColor: theme.background, borderColor: theme.backgroundSelected }]}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <ThemedText type="subtitle" style={styles.modalTitle}>
              {editingTask ? 'Edit Group Task' : 'New Group Task'}
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

            <ThemedView style={{ marginBottom: Spacing.six, backgroundColor: 'transparent' }}>
              <ThemedText type="smallBold" style={{ marginBottom: Spacing.two }}>Assign Users</ThemedText>
              {usersLoading ? (
                <ActivityIndicator color={theme.text} />
              ) : (
                <View style={styles.userList}>
                  {users.map(u => {
                    const assigned = assignedUsers.find(a => a.user === u._id);
                    const isSelected = !!assigned;
                    return (
                      <View key={u._id} style={[styles.userRow, { borderColor: theme.backgroundSelected, backgroundColor: theme.backgroundElement }]}>
                        <Pressable 
                          style={styles.userInfo} 
                          onPress={() => toggleUserSelection(u._id)}
                        >
                          <Ionicons 
                            name={isSelected ? "checkmark-circle" : "ellipse-outline"} 
                            size={24} 
                            color={isSelected ? theme.accent : theme.textSecondary} 
                          />
                          <View style={{ marginLeft: Spacing.three }}>
                            <ThemedText type="smallBold">{u.name}</ThemedText>
                            <ThemedText type="small" themeColor="textSecondary">{u.email}</ThemedText>
                          </View>
                        </Pressable>

                        {isSelected && (
                          <View style={[styles.roleSelector, { borderColor: theme.backgroundSelected }]}>
                            <Pressable 
                              onPress={() => setRole(u._id, 'viewer')}
                              style={[styles.roleBtn, assigned.role === 'viewer' && { backgroundColor: theme.backgroundSelected }]}
                            >
                              <ThemedText type="small" style={{ color: assigned.role === 'viewer' ? theme.text : theme.textSecondary }}>Viewer</ThemedText>
                            </Pressable>
                            <Pressable 
                              onPress={() => setRole(u._id, 'editor')}
                              style={[styles.roleBtn, assigned.role === 'editor' && { backgroundColor: theme.backgroundSelected }]}
                            >
                              <ThemedText type="small" style={{ color: assigned.role === 'editor' ? theme.text : theme.textSecondary }}>Editor</ThemedText>
                            </Pressable>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
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
                onPress={() => onSave({ title, description, priority, dueDate, isGroupTask: true, assignedUsers })}
                disabled={isPending}
                style={[styles.modalButton, { backgroundColor: theme.text }]}
              >
                {isPending ? (
                  <ActivityIndicator color={theme.background} />
                ) : (
                  <ThemedText type="smallBold" style={{ color: theme.background }}>
                    {editingTask ? 'Save' : 'Create'}
                  </ThemedText>
                )}
              </Pressable>
            </ThemedView>
          </ScrollView>
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
    maxHeight: '90%',
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
    height: 80,
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
  userList: {
    gap: Spacing.three,
  },
  userRow: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleSelector: {
    flexDirection: 'row',
    marginTop: Spacing.three,
    borderWidth: 1,
    borderRadius: Spacing.two,
    overflow: 'hidden',
  },
  roleBtn: {
    flex: 1,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.two,
    backgroundColor: 'transparent',
    marginTop: Spacing.four,
  },
  modalButton: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderWidth: 1,
    borderRadius: Spacing.two,
  },
});
