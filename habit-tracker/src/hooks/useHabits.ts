'use client';

import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { Habit, HabitCategory } from '@/types';
import { format, parseISO, differenceInDays, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';

export function useHabits() {
    const [habits, setHabits, isHydrated] = useLocalStorage<Habit[]>('habits', []);

    const generateId = () => `habit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const addHabit = useCallback((
        name: string,
        category: HabitCategory,
        monthlyTarget: number
    ) => {
        const newHabit: Habit = {
            id: generateId(),
            name,
            category,
            monthlyTarget,
            isActive: true,
            completedDates: [],
            createdAt: new Date().toISOString(),
        };
        setHabits((prev) => [...prev, newHabit]);
        return newHabit;
    }, [setHabits]);

    const updateHabit = useCallback((id: string, updates: Partial<Omit<Habit, 'id' | 'createdAt'>>) => {
        setHabits((prev) => prev.map((h) => (h.id === id ? { ...h, ...updates } : h)));
    }, [setHabits]);

    const deleteHabit = useCallback((id: string) => {
        setHabits((prev) => prev.filter((h) => h.id !== id));
    }, [setHabits]);

    const toggleHabitCompletion = useCallback((id: string, date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        setHabits((prev) =>
            prev.map((h) => {
                if (h.id !== id) return h;
                const hasDate = h.completedDates.includes(dateStr);
                return {
                    ...h,
                    completedDates: hasDate
                        ? h.completedDates.filter((d) => d !== dateStr)
                        : [...h.completedDates, dateStr],
                };
            })
        );
    }, [setHabits]);

    const archiveHabit = useCallback((id: string) => {
        setHabits((prev) => prev.map((h) => (h.id === id ? { ...h, isActive: false } : h)));
    }, [setHabits]);

    const unarchiveHabit = useCallback((id: string) => {
        setHabits((prev) => prev.map((h) => (h.id === id ? { ...h, isActive: true } : h)));
    }, [setHabits]);

    const calculateStreak = useCallback((habit: Habit): number => {
        if (habit.completedDates.length === 0) return 0;

        const sortedDates = [...habit.completedDates]
            .map((d) => parseISO(d))
            .sort((a, b) => b.getTime() - a.getTime());

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let streak = 0;
        let currentDate = today;

        for (const date of sortedDates) {
            const diff = differenceInDays(currentDate, date);
            if (diff === 0 || diff === 1) {
                streak++;
                currentDate = date;
            } else {
                break;
            }
        }

        return streak;
    }, []);

    const getMonthlyCompletion = useCallback((habit: Habit, year: number, month: number): number => {
        const start = startOfMonth(new Date(year, month));
        const end = endOfMonth(new Date(year, month));
        const daysInMonth = eachDayOfInterval({ start, end });

        const completedInMonth = habit.completedDates.filter((dateStr) => {
            const date = parseISO(dateStr);
            return date >= start && date <= end;
        }).length;

        return Math.round((completedInMonth / daysInMonth.length) * 100);
    }, []);

    const getCompletedDaysInMonth = useCallback((habit: Habit, year: number, month: number): string[] => {
        const start = startOfMonth(new Date(year, month));
        const end = endOfMonth(new Date(year, month));

        return habit.completedDates.filter((dateStr) => {
            const date = parseISO(dateStr);
            return date >= start && date <= end;
        });
    }, []);

    const activeHabits = habits.filter((h) => h.isActive);
    const archivedHabits = habits.filter((h) => !h.isActive);

    return {
        habits,
        activeHabits,
        archivedHabits,
        isHydrated,
        addHabit,
        updateHabit,
        deleteHabit,
        toggleHabitCompletion,
        archiveHabit,
        unarchiveHabit,
        calculateStreak,
        getMonthlyCompletion,
        getCompletedDaysInMonth,
    };
}
