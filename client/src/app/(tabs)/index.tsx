import { useState, useEffect } from 'react';
import { StyleSheet, TextInput, Pressable, ActivityIndicator, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import DraggableFlatList from 'react-native-draggable-flatlist';
import { useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/context/AuthContext';
import { fetchWeather, WeatherData } from '@/services/weather';
import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { WeatherWidget } from '@/components/widgets/weather-widget';
import { Spacing, MaxContentWidth } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Task } from '@/types/task';
import { useTasks } from '@/hooks/use-tasks';

// Custom Extracted Components
import { TaskItem } from '@/components/tasks/TaskItem';
import { TaskModal } from '@/components/tasks/TaskModal';
import { TaskOptionsModal } from '@/components/tasks/TaskOptionsModal';

export default function HomeScreen() {
  const { user } = useAuth();
  const theme = useTheme();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [optionsModalVisible, setOptionsModalVisible] = useState(false);
  const [selectedOptionsTask, setSelectedOptionsTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);

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

  const {
    tasksQuery: { data: tasks = [], isLoading, isRefetching, refetch },
    createTaskMutation,
    updateTaskMutation,
    deleteTaskMutation,
    reorderTasksMutation,
  } = useTasks(filter, search);

  const handleDragEnd = ({ data }: { data: Task[] }) => {
    queryClient.setQueryData(['tasks', filter, search], data);
    const reorderPayload = data.map((item, index) => ({
      id: item._id,
      order: index,
    }));
    reorderTasksMutation.mutate(reorderPayload);
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

  const handleSaveTask = (taskData: { title: string; description: string; priority: 'low' | 'medium' | 'high'; dueDate: Date | null }) => {
    if (!taskData.title.trim()) {
      Alert.alert('Validation Error', 'Task title is required.');
      return;
    }

    const payload = {
      title: taskData.title.trim(),
      description: taskData.description.trim(),
      priority: taskData.priority,
      dueDate: taskData.dueDate ? taskData.dueDate.toISOString() : null,
    };

    if (editingTask) {
      updateTaskMutation.mutate(
        { id: editingTask._id, ...payload },
        {
          onSuccess: () => {
            setModalVisible(false);
            setEditingTask(null);
          }
        }
      );
    } else {
      createTaskMutation.mutate(payload, {
        onSuccess: () => {
          setModalVisible(false);
        }
      });
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          
          <ThemedView style={styles.header}>
            <ThemedView>
              <ThemedText type="small" themeColor="textSecondary">Welcome back,</ThemedText>
              <ThemedText type="smallBold">{user?.name}</ThemedText>
            </ThemedView>
          </ThemedView>

          <WeatherWidget weather={weather} loading={weatherLoading} />

          <TextInput
            style={[styles.searchInput, { color: theme.text, borderColor: theme.backgroundSelected, backgroundColor: theme.backgroundElement }]}
            placeholder="Search tasks..."
            placeholderTextColor={theme.textSecondary}
            value={search}
            onChangeText={setSearch}
          />

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

          {isLoading && !isRefetching ? (
            <ActivityIndicator size="large" style={{ marginTop: Spacing.four }} />
          ) : (
            <DraggableFlatList
              data={tasks}
              renderItem={(params) => (
                <TaskItem
                  {...params}
                  selectedTask={selectedTask}
                  onSelectTask={setSelectedTask}
                  onToggleStatus={handleToggleStatus}
                  onOpenOptions={(t) => {
                    setSelectedOptionsTask(t);
                    setOptionsModalVisible(true);
                  }}
                />
              )}
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
        </SafeAreaView>

        <Pressable
          onPress={() => {
            setEditingTask(null);
            setModalVisible(true);
          }}
          style={[styles.fab, { backgroundColor: theme.text }]}
        >
          <ThemedText type="subtitle" style={{ color: theme.background, lineHeight: Platform.OS === 'ios' ? 44 : 48 }}>
            +
          </ThemedText>
        </Pressable>

        <TaskModal
          visible={modalVisible}
          editingTask={editingTask}
          isPending={createTaskMutation.isPending || updateTaskMutation.isPending}
          onSave={handleSaveTask}
          onCancel={() => {
            setModalVisible(false);
            setEditingTask(null);
          }}
        />

        <TaskOptionsModal
          visible={optionsModalVisible}
          task={selectedOptionsTask}
          onClose={() => setOptionsModalVisible(false)}
          onEdit={(t) => {
            setEditingTask(t);
            setModalVisible(true);
          }}
          onDelete={(id) => handleDeleteTask(id)}
        />
      </ThemedView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.four,
    paddingTop: Spacing.four,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    marginBottom: Spacing.four,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginBottom: Spacing.four,
  },
  filterPill: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.four,
    borderWidth: 1,
  },
  listContainer: {
    paddingBottom: 100,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: Spacing.six,
  },
  fab: {
    position: 'absolute',
    bottom: Spacing.six,
    right: Spacing.six,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
});
