import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import { api } from '@/services/api';
import { storage } from '@/services/storage';
import { Task } from '@/types/task';

export const OFFLINE_TASKS_CACHE_KEY = 'offline_tasks_cache';

let Notifications: any = null;
try {
  Notifications = require('expo-notifications');
} catch (e) {
  // Silent ignore
}

export function useTasks(filter: string, search: string) {
  const queryClient = useQueryClient();

  // Load tasks
  const tasksQuery = useQuery<Task[]>({
    queryKey: ['tasks', filter, search],
    queryFn: async () => {
      try {
        const statusParam = filter !== 'all' ? `&status=${filter}` : '';
        const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
        const response = await api.get(`/tasks?${statusParam}${searchParam}`);
        
        if (filter === 'all' && !search) {
          await storage.setItem(OFFLINE_TASKS_CACHE_KEY, JSON.stringify(response.data));
        }
        
        return response.data;
      } catch (error) {
        console.warn('Network request failed, loading cached tasks...');
        const cached = await storage.getItem(OFFLINE_TASKS_CACHE_KEY);
        if (cached) {
          const parsed: Task[] = JSON.parse(cached);
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

  const createTaskMutation = useMutation({
    mutationFn: async (payload: { title: string; description: string; priority: string; dueDate?: string | null }) => {
      const response = await api.post('/tasks', payload);
      return response.data;
    },
    onSuccess: (data: Task) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
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

  return {
    tasksQuery,
    createTaskMutation,
    updateTaskMutation,
    deleteTaskMutation,
    reorderTasksMutation,
  };
}
