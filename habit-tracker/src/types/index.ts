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
