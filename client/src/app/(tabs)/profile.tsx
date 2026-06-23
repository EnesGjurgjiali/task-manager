import { StyleSheet, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { Spacing, MaxContentWidth } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { useThemeContext } from '@/context/ThemeContext';
import { ChangePasswordModal } from '@/components/auth/ChangePasswordModal';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const theme = useTheme();
  const { themePreference, setThemePreference } = useThemeContext();
  const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);

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
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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

        <ThemedView style={styles.settingsSection}>
          <ThemedText type="smallBold" style={styles.sectionTitle}>App Settings</ThemedText>
          
          <ThemedView style={[styles.settingRow, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
            <ThemedView style={styles.settingInfo}>
              <Ionicons name="color-palette-outline" size={20} color={theme.text} />
              <ThemedText style={{ marginLeft: Spacing.two }}>Theme</ThemedText>
            </ThemedView>
            
            <ThemedView style={[styles.segmentedControl, { backgroundColor: theme.background }]}>
              {(['system', 'light', 'dark'] as const).map((t) => {
                const isSelected = themePreference === t;
                return (
                  <Pressable
                    key={t}
                    style={[
                      styles.segmentButton,
                      isSelected && [styles.segmentButtonSelected, { backgroundColor: theme.backgroundSelected }]
                    ]}
                    onPress={() => setThemePreference(t)}
                  >
                    <ThemedText 
                      type="small" 
                      style={{ 
                        color: isSelected ? theme.text : theme.textSecondary,
                        fontWeight: isSelected ? '600' : '400',
                        textTransform: 'capitalize'
                      }}
                    >
                      {t}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </ThemedView>
          </ThemedView>

          <Pressable 
            style={[styles.settingRow, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}
            onPress={() => setIsPasswordModalVisible(true)}
          >
            <ThemedView style={styles.settingInfo}>
              <Ionicons name="lock-closed-outline" size={20} color={theme.text} />
              <ThemedText style={{ marginLeft: Spacing.two }}>Change Password</ThemedText>
            </ThemedView>
            <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
          </Pressable>
        </ThemedView>

          <Pressable 
            onPress={logout} 
            style={[styles.logoutBtn, { borderColor: theme.backgroundSelected, backgroundColor: theme.backgroundElement }]}
          >
            <ThemedText style={{ textAlign: 'center', color: '#ef4444' }} type="smallBold">Sign Out</ThemedText>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
      <ChangePasswordModal 
        visible={isPasswordModalVisible} 
        onClose={() => setIsPasswordModalVisible(false)} 
      />
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
  scrollContent: {
    flexGrow: 1,
    paddingBottom: Spacing.eight,
  },
  header: {
    paddingVertical: Spacing.three,
  },
  card: {
    padding: Spacing.three,
    borderWidth: 1,
    borderRadius: Spacing.three,
    alignItems: 'center',
    marginBottom: Spacing.three,
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
    marginBottom: Spacing.four,
  },
  statBox: {
    flex: 1,
    padding: Spacing.three,
    borderWidth: 1,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
  settingsSection: {
    marginBottom: Spacing.four,
    backgroundColor: 'transparent',
  },
  sectionTitle: {
    marginBottom: Spacing.two,
    marginLeft: Spacing.one,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.three,
    borderWidth: 1,
    borderRadius: Spacing.three,
    marginBottom: Spacing.two,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: Spacing.two,
    padding: 2,
  },
  segmentButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Spacing.two,
  },
  segmentButtonSelected: {
    // shadow applied implicitly by backgroundSelected
  },
  logoutBtn: {
    paddingVertical: Spacing.three,
    borderWidth: 1,
    borderRadius: Spacing.three,
    marginTop: Spacing.two,
  },
});
