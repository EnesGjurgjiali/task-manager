import { useState, useEffect } from 'react';
import { StyleSheet, TextInput, Pressable, ActivityIndicator, Modal, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { fetchWeather, WeatherData } from '@/services/weather';
import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { WeatherWidget } from '@/components/widgets/weather-widget';
import { Spacing, BottomTabInset, MaxContentWidth } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { storage } from '@/services/storage';

let Notifications: any = null;
try {
  Notifications = require('expo-notifications');
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch (e) {
  // Silently ignore: expo-notifications is not supported in Expo Go
}

interface Task {
  _id: string;
  title: string;
  description: string;
  status: 'completed' | 'pending';
  priority: 'low' | 'medium' | 'high';
  order: number;
  createdDate: string;
  dueDate?: string;
}

const OFFLINE_TASKS_CACHE_KEY = 'offline_tasks_cache';

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const theme = useTheme();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [optionsModalVisible, setOptionsModalVisible] = useState(false);
  const [selectedOptionsTask, setSelectedOptionsTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [newTaskDueDate, setNewTaskDueDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Weather state
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);

  // Load weather
  useEffect(() => {
    const loadWeather = async () => {
      try {
        const data = await fetchWeather();
        setWeather(data);
      } catch (err) {
        console.warn('Could not load weather info:', err);
      } finally {
        setWeatherLoading(false);
      }
    };
    loadWeather();

    // Request notification permissions if available
    (async () => {
      if (Notifications) {
        try {
          const { status } = await Notifications.requestPermissionsAsync();
          if (status !== 'granted') {
            console.warn('Notification permissions not granted');
          }
        } catch (e) {
          console.warn('Could not request notification permissions', e);
        }
      }
    })();
  }, []);

  // React Query - Fetch tasks from API
  const { data: tasks = [], isLoading, isRefetching, refetch } = useQuery<Task[]>({
    queryKey: ['tasks', filter, search],
    queryFn: async () => {
      try {
        const statusParam = filter !== 'all' ? `&status=${filter}` : '';
        const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
        const response = await api.get(`/tasks?${statusParam}${searchParam}`);
        
        // Cache tasks locally for offline support
        if (filter === 'all' && !search) {
          await storage.setItem(OFFLINE_TASKS_CACHE_KEY, JSON.stringify(response.data));
        }
        
        return response.data;
      } catch (error) {
        // Fallback to offline cache on error
        console.warn('Network request failed, loading cached tasks...');
        const cached = await storage.getItem(OFFLINE_TASKS_CACHE_KEY);
        if (cached) {
          const parsed: Task[] = JSON.parse(cached);
          // Apply client-side search/filters to the cached array
          return parsed.filter(t => {
            const matchesStatus = filter === 'all' || t.status === filter;
            const matchesSearch = !search || t.title.toLowerCase().includes(search.toLowerCase());
            return matchesStatus && matchesSearch;
          });
        }
        throw error;
      }
    },
  });

  const scheduleReminder = async (taskData: Task) => {
    if (!Notifications || !taskData.dueDate || taskData.status === 'completed') return;
    const due = new Date(taskData.dueDate);
    const reminderTime = new Date(due.getTime() - 5 * 60000); // 5 minutes before
    
    if (reminderTime > new Date()) {
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `Reminder: ${taskData.title}`,
            body: 'This task is due in 5 minutes!',
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes?.DATE || 'date', date: reminderTime },
        });
      } catch (e) {
        console.warn('Could not schedule notification', e);
      }
    }
  };

  // Mutations
  const createTaskMutation = useMutation({
    mutationFn: async (payload: { title: string; description: string; priority: string; dueDate?: string | null }) => {
      const response = await api.post('/tasks', payload);
      return response.data;
    },
    onSuccess: (data: Task) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setModalVisible(false);
      setNewTaskTitle('');
      setNewTaskDescription('');
      setNewTaskPriority('medium');
      setNewTaskDueDate(null);
      scheduleReminder(data);
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.error || 'Failed to create task.');
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async (payload: { id: string; status?: 'completed' | 'pending'; title?: string; description?: string; priority?: string; dueDate?: string | null }) => {
      const { id, ...data } = payload;
      const response = await api.put(`/tasks/${id}`, data);
      return response.data;
    },
    onSuccess: (data: Task) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setModalVisible(false);
      setEditingTask(null);
      setNewTaskTitle('');
      setNewTaskDescription('');
      setNewTaskPriority('medium');
      setNewTaskDueDate(null);
      scheduleReminder(data);
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.error || 'Failed to update task.');
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/tasks/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setSelectedTask(null);
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.error || 'Failed to delete task.');
    },
  });

  const reorderTasksMutation = useMutation({
    mutationFn: async (payload: { id: string; order: number }[]) => {
      const response = await api.put('/tasks/reorder', payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.error || 'Failed to reorder tasks.');
    },
  });

  const handleDragEnd = ({ data }: { data: Task[] }) => {
    queryClient.setQueryData(['tasks', filter, search], data);
    const reorderPayload = data.map((item, index) => ({
      id: item._id,
      order: index,
    }));
    reorderTasksMutation.mutate(reorderPayload);
  };

  const handleSaveTask = () => {
    if (!newTaskTitle.trim()) {
      Alert.alert('Validation Error', 'Task title is required.');
      return;
    }
    if (editingTask) {
      updateTaskMutation.mutate({
        id: editingTask._id,
        title: newTaskTitle.trim(),
        description: newTaskDescription.trim(),
        priority: newTaskPriority,
        dueDate: newTaskDueDate ? newTaskDueDate.toISOString() : null,
      });
    } else {
      createTaskMutation.mutate({
        title: newTaskTitle.trim(),
        description: newTaskDescription.trim(),
        priority: newTaskPriority,
        dueDate: newTaskDueDate ? newTaskDueDate.toISOString() : null,
      });
    }
  };

  const handleOpenOptions = (task: Task) => {
    setSelectedOptionsTask(task);
    setNewTaskDueDate(task.dueDate ? new Date(task.dueDate) : null);
    setOptionsModalVisible(true);
  };

  const handleToggleStatus = (task: Task) => {
    const nextStatus = task.status === 'completed' ? 'pending' : 'completed';
    updateTaskMutation.mutate({
      id: task._id,
      status: nextStatus,
    });
  };

  const handleDeleteTask = (taskId: string) => {
    Alert.alert('Delete Task', 'Are you sure you want to delete this task?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteTaskMutation.mutate(taskId) },
    ]);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#3b82f6';
      default: return '#9ca3af';
    }
  };

  const renderTaskItem = ({ item, drag, isActive }: RenderItemParams<Task>) => {
    const isCompleted = item.status === 'completed';
    return (
      <Pressable 
        onLongPress={drag}
        disabled={isActive}
        onPress={() => setSelectedTask(selectedTask?._id === item._id ? null : item)}
        style={[
          styles.taskItem, 
          { backgroundColor: isActive ? theme.backgroundSelected : theme.backgroundElement, borderColor: theme.backgroundSelected },
          isActive && { transform: [{ scale: 1.02 }], elevation: 5, zIndex: 99 }
        ]}
      >
        <ThemedView style={styles.taskRow}>
          <Pressable 
            onPress={() => handleToggleStatus(item)}
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
          
          <Pressable onPress={() => handleOpenOptions(item)} style={styles.deleteButton} hitSlop={10}>
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
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
        
        {/* Header Section */}
        <ThemedView style={styles.header}>
          <ThemedView>
            <ThemedText type="small" themeColor="textSecondary">Welcome back,</ThemedText>
            <ThemedText type="smallBold">{user?.name}</ThemedText>
          </ThemedView>
        </ThemedView>

        {/* Weather Widget */}
        <WeatherWidget weather={weather} loading={weatherLoading} />

        {/* Search Bar */}
        <TextInput
          style={[styles.searchInput, { color: theme.text, borderColor: theme.backgroundSelected, backgroundColor: theme.backgroundElement }]}
          placeholder="Search tasks..."
          placeholderTextColor={theme.textSecondary}
          value={search}
          onChangeText={setSearch}
        />

        {/* Filter Pills */}
        <ThemedView style={styles.filterContainer}>
          {(['all', 'pending', 'completed'] as const).map((type) => {
            const isActive = filter === type;
            return (
              <Pressable
                key={type}
                onPress={() => setFilter(type)}
                style={[
                  styles.filterPill,
                  { borderColor: theme.backgroundSelected },
                  isActive && { backgroundColor: theme.text }
                ]}
              >
                <ThemedText 
                  type="smallBold"
                  style={[
                    { textTransform: 'capitalize' },
                    isActive && { color: theme.background }
                  ]}
                >
                  {type}
                </ThemedText>
              </Pressable>
            );
          })}
        </ThemedView>

        {/* Task List */}
        {isLoading && !isRefetching ? (
          <ActivityIndicator size="large" style={{ marginTop: Spacing.four }} />
        ) : (
          <DraggableFlatList
            data={tasks}
            renderItem={renderTaskItem}
            keyExtractor={(item) => item._id}
            onDragEnd={handleDragEnd}
            containerStyle={{ flex: 1 }}
            style={{ flex: 1 }}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={
              <ThemedView style={styles.emptyState}>
                <ThemedText themeColor="textSecondary">No tasks found</ThemedText>
              </ThemedView>
            }
          />
        )}

        {/* Floating Action Button */}
        <Pressable
          onPress={() => setModalVisible(true)}
          style={[styles.fab, { backgroundColor: theme.text }]}
        >
          <ThemedText type="subtitle" style={{ color: theme.background, lineHeight: Platform.OS === 'ios' ? 44 : 48 }}>
            +
          </ThemedText>
        </Pressable>

        {/* Create Task Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => {
            setModalVisible(false);
            setEditingTask(null);
            setNewTaskTitle('');
            setNewTaskDescription('');
            setNewTaskPriority('medium');
            setNewTaskDueDate(null);
            setShowDatePicker(false);
          }}
        >
          <ThemedView style={styles.modalOverlay}>
            <ThemedView style={[styles.modalCard, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
              <ThemedText type="smallBold" style={styles.modalTitle}>
                {editingTask ? 'Edit Task' : 'New Task'}
              </ThemedText>

              <TextInput
                style={[styles.modalInput, { color: theme.text, borderColor: theme.backgroundSelected, backgroundColor: theme.background }]}
                placeholder="Task Title"
                placeholderTextColor={theme.textSecondary}
                value={newTaskTitle}
                onChangeText={setNewTaskTitle}
              />

              <TextInput
                style={[styles.modalInput, styles.textArea, { color: theme.text, borderColor: theme.backgroundSelected, backgroundColor: theme.background }]}
                placeholder="Description"
                placeholderTextColor={theme.textSecondary}
                value={newTaskDescription}
                onChangeText={setNewTaskDescription}
                multiline
                numberOfLines={3}
              />

              <ThemedView style={styles.prioritySelector}>
                <ThemedText type="smallBold" style={{ marginBottom: Spacing.two }}>Priority</ThemedText>
                <ThemedView style={styles.priorityButtons}>
                  {(['low', 'medium', 'high'] as const).map(p => (
                    <Pressable
                      key={p}
                      onPress={() => setNewTaskPriority(p)}
                      style={[
                        styles.priorityButton,
                        { borderColor: theme.backgroundSelected },
                        newTaskPriority === p && { backgroundColor: theme.text }
                      ]}
                    >
                      <ThemedText 
                        type="small" 
                        style={[
                          { textTransform: 'capitalize' },
                          newTaskPriority === p && { color: theme.background }
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
                    value={newTaskDueDate ? new Date(newTaskDueDate.getTime() - newTaskDueDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                    onChange={(e) => setNewTaskDueDate(e.target.value ? new Date(e.target.value) : null)}
                    style={{ padding: 8, borderRadius: 8, border: '1px solid #ccc', backgroundColor: theme.backgroundElement, color: theme.text }}
                  />
                ) : (
                  <ThemedView style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'transparent' }}>
                    <Pressable 
                      onPress={() => setShowDatePicker(true)}
                      style={[styles.modalInput, { flex: 1, marginBottom: 0, justifyContent: 'center' }]}
                    >
                      <ThemedText style={{ color: newTaskDueDate ? theme.text : theme.textSecondary }}>
                        {newTaskDueDate ? newTaskDueDate.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Select Due Date...'}
                      </ThemedText>
                    </Pressable>
                    {newTaskDueDate && (
                      <Pressable onPress={() => setNewTaskDueDate(null)} style={{ padding: Spacing.two }}>
                        <Ionicons name="close-circle" size={24} color={theme.textSecondary} />
                      </Pressable>
                    )}
                  </ThemedView>
                )}
                {showDatePicker && Platform.OS !== 'web' && (
                  <DateTimePicker
                    value={newTaskDueDate || new Date()}
                    mode={Platform.OS === 'ios' ? 'datetime' : 'date'}
                    display="default"
                    onChange={(event, date) => {
                      setShowDatePicker(Platform.OS === 'ios');
                      if (date) setNewTaskDueDate(date);
                    }}
                  />
                )}
              </ThemedView>


              <ThemedView style={styles.modalButtons}>
                <Pressable
                  onPress={() => {
                    setModalVisible(false);
                    setEditingTask(null);
                    setNewTaskTitle('');
                    setNewTaskDescription('');
                    setNewTaskPriority('medium');
                    setNewTaskDueDate(null);
                    setShowDatePicker(false);
                  }}
                  style={[styles.modalButton, { borderColor: theme.backgroundSelected }]}
                >
                  <ThemedText type="small">Cancel</ThemedText>
                </Pressable>
                
                <Pressable
                  onPress={handleSaveTask}
                  disabled={createTaskMutation.isPending || updateTaskMutation.isPending}
                  style={[styles.modalButton, { backgroundColor: theme.text }]}
                >
                  {createTaskMutation.isPending || updateTaskMutation.isPending ? (
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

        {/* Task Options Modal */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={optionsModalVisible}
          onRequestClose={() => setOptionsModalVisible(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setOptionsModalVisible(false)}>
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
                  setOptionsModalVisible(false);
                  if (selectedOptionsTask) {
                    setEditingTask(selectedOptionsTask);
                    setNewTaskTitle(selectedOptionsTask.title);
                    setNewTaskDescription(selectedOptionsTask.description || '');
                    setNewTaskPriority(selectedOptionsTask.priority);
                    setModalVisible(true);
                  }
                }}
              >
                <ThemedView style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' }}>
                  <Ionicons name="pencil" size={20} color={theme.text} style={styles.optionIcon} />
                  <ThemedText type="smallBold">Edit Task</ThemedText>
                </ThemedView>
                </Pressable>

                <ThemedView style={{ height: 1, backgroundColor: theme.backgroundSelected, marginVertical: Spacing.three }} />

                <Pressable
                  style={({ pressed }) => [
                    styles.optionButton,
                    pressed && { backgroundColor: theme.backgroundSelected }
                  ]}
                onPress={() => {
                  setOptionsModalVisible(false);
                  if (selectedOptionsTask) {
                    handleDeleteTask(selectedOptionsTask._id);
                  }
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

        </SafeAreaView>
      </ThemedView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  safeArea: {
    flex: 1,
    width: '100%',
    paddingHorizontal: Spacing.three,
    maxWidth: MaxContentWidth,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.three,
  },
  logoutBtn: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderWidth: 1,
    borderRadius: Spacing.two,
  },
  searchInput: {
    height: 48,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
    marginBottom: Spacing.three,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginBottom: Spacing.four,
  },
  filterPill: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderWidth: 1,
    borderRadius: Spacing.four,
  },
  listContainer: {
    gap: Spacing.three,
    paddingBottom: 80,
  },
  taskItem: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1.5,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.three,
  },
  checkboxInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  taskTitle: {
    flex: 1,
    fontSize: 16,
  },
  deleteButton: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  taskDetails: {
    marginTop: Spacing.two,
    paddingTop: Spacing.two,
    backgroundColor: 'transparent',
  },
  taskDescription: {
    marginBottom: Spacing.two,
  },
  taskDate: {
    fontSize: 11,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.six,
  },
  fab: {
    position: 'absolute',
    bottom: Spacing.four,
    right: Spacing.four,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 2px 3.84px rgba(0, 0, 0, 0.25)',
    elevation: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  modalCard: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    padding: Spacing.four,
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  modalTitle: {
    marginBottom: Spacing.three,
    textAlign: 'center',
  },
  modalInput: {
    height: 48,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
    marginBottom: Spacing.three,
  },
  textArea: {
    height: 100,
    paddingTop: Spacing.two,
    textAlignVertical: 'top',
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
  priorityBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: Spacing.one,
    paddingHorizontal: Spacing.one,
    paddingVertical: 2,
    marginTop: Spacing.one,
    backgroundColor: 'transparent',
  },
  prioritySelector: {
    marginBottom: Spacing.four,
    backgroundColor: 'transparent',
  },
  priorityButtons: {
    flexDirection: 'row',
    gap: Spacing.two,
    backgroundColor: 'transparent',
  },
  priorityButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderWidth: 1,
    borderRadius: Spacing.two,
  },
  optionsCard: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    width: '100%',
    maxWidth: 300,
    alignSelf: 'center',
    overflow: 'hidden',
  },
  optionsTitle: {
    padding: Spacing.four,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150,150,150,0.1)',
    textAlign: 'center',
  },
  optionsList: {
    padding: Spacing.four,
    backgroundColor: 'transparent',
  },
  optionButton: {
    paddingVertical: Spacing.five,
    paddingHorizontal: Spacing.four,
  },
  optionIcon: {
    marginRight: Spacing.three,
  },
});
