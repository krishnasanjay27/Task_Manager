// Type definitions for Habit & Task Tracker

export type HabitCategory = 'Health' | 'Work' | 'Study' | 'Personal' | 'Custom';

export interface Habit {
  id: string;
  name: string;
  category: HabitCategory;
  monthlyTarget: number;
  isActive: boolean;
  completedDates: string[]; // ISO date strings (YYYY-MM-DD)
  createdAt: string;
}

export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Critical';
export type TaskStatus = 'Backlog' | 'Planned' | 'InProgress' | 'Completed';

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate?: string;
  estimatedTime?: number; // minutes
  actualTime: number; // minutes
  tags: string[];
  createdAt: string;
  timerStartedAt?: string; // ISO timestamp when timer was started
}

export interface CalendarState {
  month: number; // 0-11
  year: number;
}

export interface Analytics {
  dailyCompletion: number;
  weeklyConsistency: number;
  monthlyCompletion: number;
  currentStreak: number;
  longestStreak: number;
}

// Notification settings for push notifications
export interface NotificationSettings {
  enabled: boolean;
  habitReminders: boolean;
  taskReminders: boolean;
  reminderTime: string; // 24-hour format "HH:MM"
  quietHoursEnabled: boolean;
  quietHoursStart: string; // "HH:MM"
  quietHoursEnd: string; // "HH:MM"
}

// Default notification settings
export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: false,
  habitReminders: true,
  taskReminders: true,
  reminderTime: '20:00',
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
};
