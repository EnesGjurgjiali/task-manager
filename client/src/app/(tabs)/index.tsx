import { useState, useEffect } from 'react';
import { StyleSheet, TextInput, Pressable, FlatList, ActivityIndicator, Modal, Alert, RefreshControl, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { fetchWeather, WeatherData } from '@/services/weather';
import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { WeatherWidget } from '@/components/widgets/weather-widget';
import { Spacing, BottomTabInset, MaxContentWidth } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { storage } from '@/services/storage';

interface Task {
  _id: string;
  title: string;
  description: string;
  status: 'completed' | 'pending';
  createdDate: string;
}

const OFFLINE_TASKS_CACHE_KEY = 'offline_tasks_cache';

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const theme = useTheme();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  
  // Add task state
  const [modalVisible, setModalVisible] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  
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

  // Mutations
  const createTaskMutation = useMutation({
    mutationFn: async (payload: { title: string; description: string }) => {
      const response = await api.post('/tasks', payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setModalVisible(false);
      setNewTaskTitle('');
      setNewTaskDescription('');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.error || 'Failed to create task.');
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async (payload: { id: string; status?: 'completed' | 'pending'; title?: string; description?: string }) => {
      const { id, ...data } = payload;
      const response = await api.put(`/tasks/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
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

  const handleCreateTask = () => {
    if (!newTaskTitle.trim()) {
      Alert.alert('Validation Error', 'Task title is required.');
      return;
    }
    createTaskMutation.mutate({
      title: newTaskTitle.trim(),
      description: newTaskDescription.trim(),
    });
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

  const renderTaskItem = ({ item }: { item: Task }) => {
    const isCompleted = item.status === 'completed';
    return (
      <Pressable 
        onPress={() => setSelectedTask(selectedTask?._id === item._id ? null : item)}
        style={[styles.taskItem, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}
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
          
          <ThemedText 
            style={[
              styles.taskTitle, 
              isCompleted && { textDecorationLine: 'line-through', opacity: 0.6 }
            ]}
          >
            {item.title}
          </ThemedText>
          
          <Pressable onPress={() => handleDeleteTask(item._id)} style={styles.deleteButton}>
            <ThemedText style={{ color: '#ef4444' }} type="smallBold">
              Delete
            </ThemedText>
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
          <FlatList
            data={tasks}
            renderItem={renderTaskItem}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
            }
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
          onRequestClose={() => setModalVisible(false)}
        >
          <ThemedView style={styles.modalOverlay}>
            <ThemedView style={[styles.modalCard, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
              <ThemedText type="smallBold" style={styles.modalTitle}>
                New Task
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

              <ThemedView style={styles.modalButtons}>
                <Pressable
                  onPress={() => setModalVisible(false)}
                  style={[styles.modalButton, { borderColor: theme.backgroundSelected }]}
                >
                  <ThemedText type="small">Cancel</ThemedText>
                </Pressable>
                
                <Pressable
                  onPress={handleCreateTask}
                  disabled={createTaskMutation.isPending}
                  style={[styles.modalButton, { backgroundColor: theme.text }]}
                >
                  {createTaskMutation.isPending ? (
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

      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.three,
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
});
