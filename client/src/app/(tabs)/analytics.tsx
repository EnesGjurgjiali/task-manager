import React, { useMemo } from 'react';
import { StyleSheet, ActivityIndicator, ScrollView, Dimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PieChart } from 'react-native-chart-kit';

import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { Spacing, MaxContentWidth } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTasks } from '@/hooks/use-tasks';

const screenWidth = Dimensions.get('window').width;

export default function AnalyticsScreen() {
  const theme = useTheme();
  
  // We fetch all tasks to calculate analytics
  const { tasksQuery: { data: tasks = [], isLoading } } = useTasks('all', '');

  const analytics = useMemo(() => {
    const completedTasks = tasks.filter(t => t.status === 'completed' && t.completedDate);
    
    // 1. Total tasks finished this month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const tasksThisMonth = completedTasks.filter(t => new Date(t.completedDate!) >= startOfMonth).length;

    // 2. High vs Low Priority Ratio
    const priorityCounts = { high: 0, medium: 0, low: 0 };
    completedTasks.forEach(t => {
      if (t.priority === 'high') priorityCounts.high++;
      else if (t.priority === 'medium') priorityCounts.medium++;
      else if (t.priority === 'low') priorityCounts.low++;
    });

    // 3. Weekly Streak Calculation
    // Find all unique weeks where a task was completed
    const completedWeeks = new Set<string>();
    completedTasks.forEach(t => {
      const date = new Date(t.completedDate!);
      // Calculate start of the week (Sunday)
      const startOfWeek = new Date(date);
      startOfWeek.setDate(date.getDate() - date.getDay());
      startOfWeek.setHours(0,0,0,0);
      completedWeeks.add(startOfWeek.toISOString());
    });

    // Sort weeks descending
    const sortedWeeks = Array.from(completedWeeks).map(w => new Date(w).getTime()).sort((a, b) => b - a);
    
    let currentStreak = 0;
    const currentWeekStart = new Date();
    currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay());
    currentWeekStart.setHours(0,0,0,0);
    
    let expectedWeek = currentWeekStart.getTime();
    
    // Allow the streak to carry over if they haven't completed a task THIS week yet, but did LAST week
    const lastWeekStart = expectedWeek - 7 * 24 * 60 * 60 * 1000;
    
    if (sortedWeeks.includes(expectedWeek)) {
      currentStreak = 1;
      expectedWeek -= 7 * 24 * 60 * 60 * 1000;
    } else if (sortedWeeks.includes(lastWeekStart)) {
      // Streak starts from last week
      expectedWeek = lastWeekStart;
    }

    if (currentStreak > 0 || sortedWeeks.includes(lastWeekStart)) {
      for (const week of sortedWeeks) {
        if (week === expectedWeek) {
          currentStreak++;
          expectedWeek -= 7 * 24 * 60 * 60 * 1000;
        } else if (week < expectedWeek) {
          break; // Streak broken
        }
      }
    }

    return {
      tasksThisMonth,
      priorityCounts,
      currentStreak,
      totalCompleted: completedTasks.length
    };
  }, [tasks]);

  const chartData = [
    {
      name: 'High',
      count: analytics.priorityCounts.high,
      color: theme.destructive || '#ef4444',
      legendFontColor: theme.text,
      legendFontSize: 14,
    },
    {
      name: 'Medium',
      count: analytics.priorityCounts.medium,
      color: theme.warning || '#f59e0b',
      legendFontColor: theme.text,
      legendFontSize: 14,
    },
    {
      name: 'Low',
      count: analytics.priorityCounts.low,
      color: theme.accent || '#3b82f6',
      legendFontColor: theme.text,
      legendFontSize: 14,
    },
  ].filter(d => d.count > 0);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.header}>
          <ThemedText type="subtitle">Productivity Dashboard</ThemedText>
        </ThemedView>

        {isLoading ? (
          <ThemedView style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.text} />
          </ThemedView>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            
            <ThemedView style={styles.metricsRow}>
              <ThemedView style={[styles.metricCard, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
                <Ionicons name="flame" size={28} color="#f97316" />
                <ThemedText type="subtitle" style={styles.metricValue}>{analytics.currentStreak}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>Week Streak</ThemedText>
              </ThemedView>

              <ThemedView style={[styles.metricCard, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
                <Ionicons name="checkmark-done-circle" size={28} color="#10b981" />
                <ThemedText type="subtitle" style={styles.metricValue}>{analytics.tasksThisMonth}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>Done This Month</ThemedText>
              </ThemedView>
            </ThemedView>

            <ThemedView style={[styles.chartCard, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
              <ThemedText type="smallBold" style={{ marginBottom: Spacing.four }}>
                Priority Breakdown
              </ThemedText>
              
              {chartData.length > 0 ? (
                <>
                  <PieChart
                    data={chartData}
                    width={Platform.OS === 'web' ? Math.min(screenWidth - Spacing.four * 4, 400) : screenWidth - Spacing.four * 4}
                    height={200}
                    chartConfig={{
                      color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                      labelColor: (opacity = 1) => theme.text,
                    }}
                    accessor={"count"}
                    backgroundColor={"transparent"}
                    paddingLeft={"0"}
                    center={[(Platform.OS === 'web' ? Math.min(screenWidth - Spacing.four * 4, 400) : screenWidth - Spacing.four * 4) / 4, 0]}
                    absolute
                    hasLegend={false}
                  />
                  <ThemedView style={styles.legendContainer}>
                    {chartData.map((data, index) => (
                      <ThemedView key={index} style={styles.legendItem}>
                        <ThemedView style={[styles.legendColorBox, { backgroundColor: data.color }]} />
                        <ThemedText type="small">{data.name} ({data.count})</ThemedText>
                      </ThemedView>
                    ))}
                  </ThemedView>
                </>
              ) : (
                <ThemedView style={{ padding: Spacing.four, alignItems: 'center' }}>
                  <ThemedText themeColor="textSecondary">No completed tasks yet.</ThemedText>
                </ThemedView>
              )}
            </ThemedView>
            
            <ThemedView style={[styles.summaryCard, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
               <ThemedText type="smallBold" style={{ marginBottom: Spacing.two }}>Summary</ThemedText>
               <ThemedText themeColor="textSecondary" style={{ lineHeight: 22 }}>
                 You have completed a total of <ThemedText type="smallBold">{analytics.totalCompleted}</ThemedText> tasks 
                 since you started. Keep up the great work and maintain your weekly momentum!
               </ThemedText>
            </ThemedView>

          </ScrollView>
        )}
      </SafeAreaView>
    </ThemedView>
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
  },
  header: {
    paddingVertical: Spacing.four,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: Spacing.four,
    marginBottom: Spacing.four,
  },
  metricCard: {
    flex: 1,
    padding: Spacing.four,
    borderRadius: Spacing.three,
    borderWidth: 1,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  metricValue: {
    fontSize: 28,
    marginTop: Spacing.two,
    marginBottom: 4,
  },
  chartCard: {
    padding: Spacing.four,
    borderRadius: Spacing.three,
    borderWidth: 1,
    marginBottom: Spacing.four,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    alignItems: 'center',
  },
  summaryCard: {
    padding: Spacing.four,
    borderRadius: Spacing.three,
    borderWidth: 1,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: Spacing.four,
    marginTop: Spacing.two,
    backgroundColor: 'transparent',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  legendColorBox: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  }
});
