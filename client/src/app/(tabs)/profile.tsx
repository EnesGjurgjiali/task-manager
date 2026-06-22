import React from 'react';
import { StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { ThemedText } from '../../components/themed-text';
import { ThemedView } from '../../components/themed-view';
import { Spacing, MaxContentWidth } from '../../constants/theme';
import { useTheme } from '../../hooks/use-theme';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const theme = useTheme();

  // Fetch total tasks
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks', 'all', ''],
    queryFn: async () => {
      const response = await api.get('/tasks');
      return response.data;
    },
  });

  const joinedDate = user?.createdAt 
    ? new Date(user.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Unknown';

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        
        <ThemedView style={styles.header}>
          <ThemedText type="title">Profile</ThemedText>
        </ThemedView>

        <ThemedView style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
          <ThemedView style={[styles.avatarPlaceholder, { backgroundColor: theme.text }]}>
            <ThemedText style={{ fontSize: 40, color: theme.background }}>
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </ThemedText>
          </ThemedView>

          <ThemedText type="subtitle" style={styles.name}>{user?.name}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.email}>{user?.email}</ThemedText>
        </ThemedView>

        <ThemedView style={styles.statsContainer}>
          <ThemedView style={[styles.statBox, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
            <ThemedText type="small" themeColor="textSecondary">Total Tasks</ThemedText>
            {tasksLoading ? (
              <ActivityIndicator size="small" style={{ marginTop: Spacing.two }} />
            ) : (
              <ThemedText type="subtitle" style={{ marginTop: Spacing.one }}>{tasks.length}</ThemedText>
            )}
          </ThemedView>
          
          <ThemedView style={[styles.statBox, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
            <ThemedText type="small" themeColor="textSecondary">Joined</ThemedText>
            <ThemedText type="smallBold" style={{ marginTop: Spacing.one }}>{joinedDate}</ThemedText>
          </ThemedView>
        </ThemedView>

        <Pressable 
          onPress={logout} 
          style={[styles.logoutBtn, { borderColor: theme.backgroundSelected, backgroundColor: theme.backgroundElement }]}
        >
          <ThemedText style={{ textAlign: 'center', color: '#ef4444' }} type="smallBold">Sign Out</ThemedText>
        </Pressable>

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
    maxWidth: MaxContentWidth,
    width: '100%',
  },
  header: {
    paddingVertical: Spacing.four,
  },
  card: {
    padding: Spacing.four,
    borderWidth: 1,
    borderRadius: Spacing.three,
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.three,
  },
  name: {
    marginBottom: Spacing.one,
  },
  email: {
    marginBottom: Spacing.three,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginBottom: Spacing.six,
  },
  statBox: {
    flex: 1,
    padding: Spacing.three,
    borderWidth: 1,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
  logoutBtn: {
    paddingVertical: Spacing.three,
    borderWidth: 1,
    borderRadius: Spacing.three,
    marginTop: 'auto',
    marginBottom: Spacing.six,
  },
});
